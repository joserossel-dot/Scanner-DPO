import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticateToken } from '../middlewares/auth.js';
import { resolveActiveOrganization, requireOrganizationPermission } from '../tenancy/organizationContext.js';
import { evaluateDiscoveryAnswers, mapAnswersToFlow } from '../services/discoveryMapping.js';

const router = Router();
router.use(authenticateToken, resolveActiveOrganization);

router.get('/schema', requireOrganizationPermission('compliance.read'), async (_req, res) => {
  try {
    const result = await getDb().query(`SELECT id, schema_code, version, title, locale, definition, effective_from
      FROM discovery_schema_versions WHERE schema_code = 'SME_DATA_DISCOVERY' AND locale = 'es-CL' AND status = 'ACTIVE' LIMIT 1`);
    if (!result.rowCount) return res.status(404).json({ error: 'No existe un cuestionario de descubrimiento activo.' });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching discovery schema:', error.message);
    res.status(500).json({ error: 'Error al consultar el cuestionario de descubrimiento.' });
  }
});

router.post('/sessions', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  try {
    const result = await getDb().query(`INSERT INTO discovery_sessions
      (organization_id, schema_version_id, respondent_contact_id, started_by)
      SELECT $1, id, $2, $3 FROM discovery_schema_versions
      WHERE schema_code = 'SME_DATA_DISCOVERY' AND locale = 'es-CL' AND status = 'ACTIVE'
      RETURNING *`, [req.organization.id, req.body.respondent_contact_id || null, req.user.id]);
    if (!result.rowCount) return res.status(409).json({ error: 'No existe un cuestionario activo para iniciar.' });
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating discovery session:', error.message);
    res.status(500).json({ error: 'Error al iniciar el descubrimiento.' });
  }
});

router.get('/sessions/current', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  const result = await getDb().query(
    `SELECT * FROM discovery_sessions WHERE organization_id = $1 AND status = 'IN_PROGRESS'
      ORDER BY updated_at DESC LIMIT 1`,
    [req.organization.id]
  );
  res.json(result.rows[0] || null);
});

router.get('/sessions/:id', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  try {
    const [session, processes] = await Promise.all([
      getDb().query('SELECT * FROM discovery_sessions WHERE id = $1 AND organization_id = $2', [req.params.id, req.organization.id]),
      getDb().query('SELECT * FROM discovered_processes WHERE session_id = $1 AND organization_id = $2 ORDER BY created_at', [req.params.id, req.organization.id])
    ]);
    if (!session.rowCount) return res.status(404).json({ error: 'Sesión de descubrimiento no encontrada.' });
    res.json({ ...session.rows[0], processes: processes.rows });
  } catch (error: any) {
    console.error('Error fetching discovery session:', error.message);
    res.status(500).json({ error: 'Error al consultar el descubrimiento.' });
  }
});

router.post('/sessions/:id/processes', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const { process_template_code, display_name, answers = {} } = req.body;
  if (!process_template_code || !display_name) return res.status(400).json({ error: 'Debe indicar el tipo y nombre cotidiano del proceso.' });
  const evaluation = evaluateDiscoveryAnswers(answers);
  try {
    const result = await getDb().query(`INSERT INTO discovered_processes
      (organization_id, session_id, process_template_code, display_name, answers, unknown_fields, completeness_percent, review_status)
      SELECT $1, s.id, $3, $4, $5, $6, $7, $8 FROM discovery_sessions s
      WHERE s.id = $2 AND s.organization_id = $1 AND s.status = 'IN_PROGRESS'
      RETURNING *`, [req.organization.id, req.params.id, process_template_code, display_name, JSON.stringify(answers),
      JSON.stringify(evaluation.unknownFields), evaluation.completenessPercent,
      evaluation.readyForReview ? 'READY_FOR_REVIEW' : 'NEEDS_INFORMATION']);
    if (!result.rowCount) return res.status(404).json({ error: 'La sesión no existe o ya no admite respuestas.' });
    res.status(201).json({ ...result.rows[0], applicable_questions: evaluation.applicable });
  } catch (error: any) {
    console.error('Error creating discovered process:', error.message);
    res.status(500).json({ error: 'Error al guardar el proceso descubierto.' });
  }
});

router.put('/processes/:id/answers', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const answers = req.body.answers || {};
  const evaluation = evaluateDiscoveryAnswers(answers);
  try {
    const result = await getDb().query(`UPDATE discovered_processes SET answers = $1, unknown_fields = $2,
      completeness_percent = $3, review_status = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND organization_id = $6 AND mapped_flow_id IS NULL RETURNING *`, [JSON.stringify(answers),
      JSON.stringify(evaluation.unknownFields), evaluation.completenessPercent,
      evaluation.readyForReview ? 'READY_FOR_REVIEW' : 'NEEDS_INFORMATION', req.params.id, req.organization.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Proceso no encontrado o ya confirmado.' });
    res.json({ ...result.rows[0], applicable_questions: evaluation.applicable });
  } catch (error: any) {
    console.error('Error updating discovery answers:', error.message);
    res.status(500).json({ error: 'Error al guardar las respuestas.' });
  }
});

router.get('/processes/:id/mapping-preview', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  try {
    const result = await getDb().query('SELECT * FROM discovered_processes WHERE id = $1 AND organization_id = $2', [req.params.id, req.organization.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Proceso descubierto no encontrado.' });
    const process = result.rows[0];
    res.json({ process: { id: process.id, display_name: process.display_name }, ...mapAnswersToFlow(process.answers) });
  } catch (error: any) {
    console.error('Error previewing discovery mapping:', error.message);
    res.status(500).json({ error: 'Error al preparar la vista previa del flujo.' });
  }
});

router.post('/processes/:id/map-draft', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM discovered_processes WHERE id = $1 AND organization_id = $2 FOR UPDATE', [req.params.id, req.organization.id]);
    if (!found.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Proceso descubierto no encontrado.' });
    }
    const process = found.rows[0];
    if (process.mapped_flow_id) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este proceso ya fue convertido a un borrador.' });
    }
    const mapped = mapAnswersToFlow(process.answers);
    if (!mapped.evaluation.readyForReview) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Falta información antes de crear el borrador.',
        unknown_fields: mapped.evaluation.unknownFields
      });
    }
    const ropa = await client.query(`INSERT INTO ropa_inventory
      (user_id, organization_id, process_name, purpose, legal_basis, data_categories, retention_period,
       cross_border_transfer, source, status, data_sources, data_subject_categories, recipients, deletion_method,
       process_owner_contact_id, contains_sensitive_data, sensitive_data_categories, security_measures,
       automated_decisions, automated_decision_details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'adaptive_discovery', 'draft', $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`, [req.user.id, req.organization.id, process.display_name, mapped.flow.purpose, mapped.flow.legal_basis,
      JSON.stringify(mapped.flow.data_categories), mapped.flow.retention_period, process.answers.internationalTransfer === true,
      JSON.stringify(mapped.flow.data_sources), JSON.stringify(mapped.flow.data_subject_categories), JSON.stringify(mapped.flow.recipient_roles),
      mapped.flow.deletion_method, mapped.flow.process_owner_contact_id, mapped.ropa.contains_sensitive_data,
      JSON.stringify(mapped.ropa.sensitive_data_categories), JSON.stringify(mapped.flow.security_controls), mapped.ropa.automated_decisions,
      mapped.ropa.automated_decision_details]);
    const flowFields = Object.entries({ ...mapped.flow, ropa_activity_id: ropa.rows[0].id })
      .filter(([, value]) => value !== undefined);
    const flowColumns = ['organization_id', 'created_by', ...flowFields.map(([key]) => key)];
    const flowValues = [req.organization.id, req.user.id, ...flowFields.map(([, value]) => Array.isArray(value) ? JSON.stringify(value) : value)];
    const flow = await client.query(`INSERT INTO processing_data_flows (${flowColumns.join(', ')})
      VALUES (${flowColumns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`, flowValues);
    await client.query(`UPDATE discovered_processes SET mapped_ropa_activity_id = $1, mapped_flow_id = $2,
      review_status = 'READY_FOR_REVIEW', updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND organization_id = $4`,
    [ropa.rows[0].id, flow.rows[0].id, process.id, req.organization.id]);
    await client.query('COMMIT');
    res.status(201).json({ ropa_activity: ropa.rows[0], data_flow: flow.rows[0], requires_professional_review: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error mapping discovery draft:', error.message);
    res.status(500).json({ error: 'Error al convertir las respuestas en borradores.' });
  } finally {
    client.release();
  }
});

export default router;
