import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../database/db.js';
import { authenticateToken } from '../middlewares/auth.js';
import { evaluateEligibility } from '../services/eligibilityService.js';
import { buildManagedDocument, documentTitle, type ManagedDocumentType } from '../services/managedDocumentBuilder.js';
import { assessLegalDeliverables, type EvidenceStatus, type LegalEvidence } from '../services/legalDeliverablesService.js';
import { resolveActiveOrganization, requireOrganizationPermission } from '../tenancy/organizationContext.js';

const router = Router();
router.use(authenticateToken);
router.use(resolveActiveOrganization);

const validTaskStatuses = new Set([
  'PENDING', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'APPROVED', 'COMPLETED', 'CANCELLED'
]);
const managedDocumentTypes = new Set<ManagedDocumentType>([
  'EMPLOYEE_ANNEX', 'PROCESSOR_ANNEX', 'PRIVACY_NOTICE', 'DATA_PROTECTION_POLICY',
  'RETENTION_POLICY', 'ARCO_PROCEDURE', 'INCIDENT_PLAYBOOK'
]);

const evidenceStatus = (confirmed: boolean, draft: boolean): EvidenceStatus => confirmed ? 'CONFIRMED' : draft ? 'DRAFT' : 'MISSING';

router.get('/workspace', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  try {
    const db = getDb();
    const organizationId = req.organization.id;
    const [organization, engagement, eligibility, taskStats, nextTasks, reviews, contacts, readiness] = await Promise.all([
      db.query(`SELECT id, name, legal_name, tax_identifier FROM organizations WHERE id = $1`, [organizationId]),
      db.query(`SELECT * FROM service_engagements WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 1`, [organizationId]),
      db.query(`SELECT * FROM eligibility_assessments WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 1`, [organizationId]),
      db.query(`SELECT status, COUNT(*)::int AS count FROM compliance_tasks WHERE organization_id = $1 GROUP BY status`, [organizationId]),
      db.query(`SELECT * FROM compliance_tasks WHERE organization_id = $1 AND status NOT IN ('COMPLETED', 'CANCELLED') ORDER BY due_date NULLS LAST, priority DESC LIMIT 20`, [organizationId]),
      db.query(`SELECT * FROM periodic_reviews WHERE organization_id = $1 ORDER BY period_start ASC LIMIT 20`, [organizationId]),
      db.query(`SELECT * FROM organization_contacts WHERE organization_id = $1 AND active = TRUE ORDER BY is_primary DESC, full_name`, [organizationId]),
      db.query(`SELECT
        EXISTS(SELECT 1 FROM audit_reports WHERE organization_id = $1 AND pages_analyzed IS NOT NULL AND pages_analyzed::text <> '[]') AS has_web_scan,
        EXISTS(SELECT 1 FROM audit_reports WHERE organization_id = $1 AND questionnaire_answers IS NOT NULL) AS has_questionnaire,
        EXISTS(SELECT 1 FROM ropa_inventory WHERE organization_id = $1 AND status = 'confirmed') AS has_confirmed_ropa,
        EXISTS(SELECT 1 FROM risk_matrix WHERE organization_id = $1) AS has_risk_assessment,
        EXISTS(SELECT 1 FROM control_assessments WHERE organization_id = $1) AS has_control_assessment,
        (SELECT COUNT(*)::int FROM documents WHERE organization_id = $1 AND workflow_status = 'APPROVED' AND is_active = TRUE) AS approved_documents`, [organizationId])
    ]);
    res.json({
      permissions: req.organization.permissions,
      organization: organization.rows[0] || null,
      engagement: engagement.rows[0] || null,
      eligibility: eligibility.rows[0] || null,
      taskStats: taskStats.rows,
      nextTasks: nextTasks.rows,
      periodicReviews: reviews.rows,
      contacts: contacts.rows,
      readiness: readiness.rows[0]
    });
  } catch (error: any) {
    console.error('Error loading service workspace:', error.message);
    res.status(500).json({ error: 'No fue posible cargar el expediente del servicio.' });
  }
});

router.get('/deliverables/readiness', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  try {
    const db = getDb();
    const org = req.organization.id;
    const [organization, contacts, ropa, flows, parties, controls, risks, documents, incidents, consents, training] = await Promise.all([
      db.query('SELECT legal_name, tax_identifier FROM organizations WHERE id = $1', [org]),
      db.query('SELECT COUNT(*)::int AS count FROM organization_contacts WHERE organization_id = $1 AND active = TRUE', [org]),
      db.query(`SELECT COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed, COUNT(*)::int AS total FROM ropa_inventory WHERE organization_id = $1`, [org]),
      db.query(`SELECT COUNT(*) FILTER (WHERE review_status = 'CONFIRMED' AND evidence_status = 'VERIFIED')::int AS confirmed,
        COUNT(*) FILTER (WHERE review_status <> 'ARCHIVED')::int AS total,
        COUNT(*) FILTER (WHERE jsonb_array_length(destination_countries) > 0)::int AS transfers,
        COUNT(*) FILTER (WHERE jsonb_array_length(destination_countries) > 0 AND transfer_mechanism IS NOT NULL AND jsonb_array_length(transfer_safeguards) > 0)::int AS protected_transfers
        FROM processing_data_flows WHERE organization_id = $1`, [org]),
      db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE data_processing_terms_status IN ('SIGNED','NOT_REQUIRED'))::int AS confirmed FROM external_parties WHERE organization_id = $1`, [org]),
      db.query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ca.status IN ('IMPLEMENTED','NOT_APPLICABLE') AND EXISTS (
          SELECT 1 FROM compliance_evidence ce WHERE ce.organization_id = ca.organization_id
            AND ce.subject_type = 'CONTROL' AND ce.subject_id = ca.id AND ce.verification_status = 'VERIFIED'
        ))::int AS confirmed FROM control_assessments ca WHERE organization_id = $1`, [org]),
      db.query('SELECT COUNT(*)::int AS total FROM risk_matrix WHERE organization_id = $1', [org]),
      db.query(`SELECT document_type, workflow_status FROM documents WHERE organization_id = $1 AND is_active = TRUE`, [org]),
      db.query('SELECT COUNT(*)::int AS total FROM security_incidents WHERE organization_id = $1', [org]),
      db.query('SELECT COUNT(*)::int AS total FROM form_consent_logs WHERE organization_id = $1', [org]),
      db.query('SELECT COUNT(*)::int AS total FROM employee_trainings WHERE organization_id = $1', [org])
    ]);
    const docStatus = (type: ManagedDocumentType): EvidenceStatus => {
      const matching = documents.rows.filter((row: any) => row.document_type === type);
      return evidenceStatus(matching.some((row: any) => row.workflow_status === 'APPROVED'), matching.length > 0);
    };
    const hasOrganization = Boolean(organization.rows[0]?.legal_name && organization.rows[0]?.tax_identifier);
    const flowConfirmed = Number(flows.rows[0]?.confirmed || 0) > 0;
    const flowDraft = Number(flows.rows[0]?.total || 0) > 0 || Number(ropa.rows[0]?.total || 0) > 0;
    const transferTotal = Number(flows.rows[0]?.transfers || 0);
    const transferConfirmed = transferTotal === Number(flows.rows[0]?.protected_transfers || 0) && flowConfirmed;
    const evidence: LegalEvidence = {
      organization: evidenceStatus(hasOrganization, Boolean(organization.rows[0]?.legal_name)),
      governance: evidenceStatus(Number(contacts.rows[0]?.count || 0) > 0 && docStatus('DATA_PROTECTION_POLICY') === 'CONFIRMED', Number(contacts.rows[0]?.count || 0) > 0),
      processingInventory: evidenceStatus(flowConfirmed, flowDraft),
      lawfulBasis: evidenceStatus(flowConfirmed, flowDraft),
      transparency: docStatus('PRIVACY_NOTICE'),
      rightsProcedure: docStatus('ARCO_PROCEDURE'),
      processors: evidenceStatus(Number(parties.rows[0]?.total || 0) > 0 && parties.rows[0].total === parties.rows[0].confirmed, Number(parties.rows[0]?.total || 0) > 0),
      internationalTransfers: transferTotal === 0 ? evidenceStatus(flowConfirmed, flowDraft) : evidenceStatus(transferConfirmed, flowDraft),
      retentionAndDeletion: evidenceStatus(flowConfirmed, flowDraft),
      securityMeasures: evidenceStatus(Number(controls.rows[0]?.confirmed || 0) > 0, Number(controls.rows[0]?.total || 0) > 0),
      incidentResponse: evidenceStatus(docStatus('INCIDENT_PLAYBOOK') === 'CONFIRMED', docStatus('INCIDENT_PLAYBOOK') === 'DRAFT' || Number(incidents.rows[0]?.total || 0) > 0),
      riskAndImpactAssessment: evidenceStatus(Number(risks.rows[0]?.total || 0) > 0, false),
      consentEvidence: evidenceStatus(Number(consents.rows[0]?.total || 0) > 0, false),
      training: evidenceStatus(Number(training.rows[0]?.total || 0) > 0, false),
      approvalsAndVersioning: evidenceStatus(documents.rows.some((row: any) => row.workflow_status === 'APPROVED'), documents.rows.length > 0)
    };
    res.json({ evidence, deliverables: assessLegalDeliverables(evidence) });
  } catch (error: any) {
    console.error('Error evaluating legal deliverables:', error.message);
    res.status(500).json({ error: 'No fue posible evaluar los entregables del expediente.' });
  }
});

router.patch('/organization', requireOrganizationPermission('service.manage'), async (req: any, res) => {
  const legalName = typeof req.body.legal_name === 'string' ? req.body.legal_name.trim() : '';
  const taxIdentifier = typeof req.body.tax_identifier === 'string' ? req.body.tax_identifier.trim() : '';
  if (!legalName || legalName.length > 255 || taxIdentifier.length > 100) {
    return res.status(400).json({ error: 'Razón social válida es obligatoria y el identificador no puede superar 100 caracteres.' });
  }
  const result = await getDb().query(
    `UPDATE organizations SET legal_name = $1, tax_identifier = NULLIF($2, ''), updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 RETURNING id, name, legal_name, tax_identifier`,
    [legalName, taxIdentifier, req.organization.id]
  );
  res.json(result.rows[0]);
});

router.post('/eligibility', requireOrganizationPermission('service.manage'), async (req: any, res) => {
  const employeeCount = Number(req.body.employee_count);
  const operatesInChile = req.body.operates_in_chile !== false;
  const industries = Array.isArray(req.body.industries) ? req.body.industries.map(String) : [];
  const riskFactors = req.body.risk_factors && typeof req.body.risk_factors === 'object'
    ? req.body.risk_factors
    : {};

  let evaluation;
  try {
    evaluation = evaluateEligibility({ employeeCount, operatesInChile, industries, riskFactors });
  } catch {
    return res.status(400).json({ error: 'La cantidad de trabajadores debe ser un número entero no negativo.' });
  }

  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    let engagement = await client.query(
      `SELECT * FROM service_engagements WHERE organization_id = $1 AND status NOT IN ('REJECTED', 'CLOSED') ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [req.organization.id]
    );
    if (!engagement.rowCount) {
      engagement = await client.query(
        `INSERT INTO service_engagements (organization_id, status, created_by)
         VALUES ($1, 'ELIGIBILITY_REVIEW', $2) RETURNING *`,
        [req.organization.id, req.user.id]
      );
    }
    const result = await client.query(
      `INSERT INTO eligibility_assessments
       (organization_id, engagement_id, employee_count, operates_in_chile, industries,
        risk_factors, answers, decision, reasons, rules_version, assessed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.organization.id,
        engagement.rows[0].id,
        employeeCount,
        operatesInChile,
        JSON.stringify(industries),
        JSON.stringify(riskFactors),
        JSON.stringify(req.body.answers || {}),
        evaluation.decision,
        JSON.stringify(evaluation.reasons),
        evaluation.rulesVersion,
        req.user.id
      ]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error saving eligibility assessment:', error.message);
    res.status(500).json({ error: 'No fue posible guardar la evaluación de admisibilidad.' });
  } finally {
    client.release();
  }
});

router.post('/eligibility/:id/review', requireOrganizationPermission('service.review'), async (req: any, res) => {
  const professionalStatus = String(req.body.professional_status || '');
  if (!['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].includes(professionalStatus)) {
    return res.status(400).json({ error: 'Estado de revisión profesional inválido.' });
  }
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const assessment = await client.query(
      `UPDATE eligibility_assessments
          SET professional_status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND organization_id = $4
        RETURNING *`,
      [professionalStatus, req.user.id, req.params.id, req.organization.id]
    );
    if (!assessment.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Evaluación no encontrada.' });
    }
    const row = assessment.rows[0];
    const engagementStatus = professionalStatus === 'APPROVED'
      ? row.decision === 'STANDARD' || row.decision === 'STANDARD_WITH_ADDON' ? 'ACCEPTED' : 'SPECIAL_ASSESSMENT'
      : professionalStatus === 'REJECTED' ? 'REJECTED' : 'ELIGIBILITY_REVIEW';
    await client.query(
      `UPDATE service_engagements SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND organization_id = $3`,
      [engagementStatus, row.engagement_id, req.organization.id]
    );
    await client.query(
      `INSERT INTO compliance_reviews
       (organization_id, subject_type, subject_id, decision, comments, reviewer_id, rules_version)
       VALUES ($1, 'ELIGIBILITY', $2, $3, $4, $5, $6)`,
      [
        req.organization.id,
        row.id,
        professionalStatus === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED' : professionalStatus,
        req.body.comments || null,
        req.user.id,
        row.rules_version
      ]
    );
    await client.query('COMMIT');
    res.json({ assessment: row, engagement_status: engagementStatus });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error reviewing eligibility:', error.message);
    res.status(500).json({ error: 'No fue posible registrar la revisión profesional.' });
  } finally {
    client.release();
  }
});

router.post('/engagement/activate', requireOrganizationPermission('service.manage'), async (req: any, res) => {
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const engagement = await client.query(
      `SELECT se.* FROM service_engagements se
       JOIN eligibility_assessments ea ON ea.engagement_id = se.id
       WHERE se.organization_id = $1 AND se.status = 'ACCEPTED'
         AND ea.professional_status = 'APPROVED'
       ORDER BY ea.created_at DESC LIMIT 1 FOR UPDATE OF se`,
      [req.organization.id]
    );
    if (!engagement.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'La admisibilidad debe estar aprobada antes de activar el servicio.' });
    }
    const startsOn = req.body.starts_on ? new Date(`${req.body.starts_on}T00:00:00Z`) : new Date();
    if (Number.isNaN(startsOn.getTime())) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Fecha de inicio inválida.' });
    }
    const endsOn = new Date(startsOn);
    endsOn.setUTCFullYear(endsOn.getUTCFullYear() + 1);
    endsOn.setUTCDate(endsOn.getUTCDate() - 1);
    const engagementId = engagement.rows[0].id;
    const updated = await client.query(
      `UPDATE service_engagements
          SET status = 'ONBOARDING', starts_on = $1, ends_on = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 RETURNING *`,
      [startsOn.toISOString().slice(0, 10), endsOn.toISOString().slice(0, 10), engagementId]
    );

    const initialTasks = [
      [1, 'Completar diagnóstico inicial', 'HIGH'],
      [3, 'Confirmar inventario y mapa de flujos', 'HIGH'],
      [4, 'Revisar matriz de bases de licitud', 'HIGH'],
      [7, 'Revisar políticas y avisos', 'MEDIUM'],
      [8, 'Configurar canal y procedimiento ARCO+', 'HIGH'],
      [10, 'Preparar anexos laborales', 'MEDIUM'],
      [15, 'Preparar anexos de proveedores', 'MEDIUM'],
      [17, 'Ejecutar capacitación inicial', 'MEDIUM']
    ];
    for (const [activityCode, title, priority] of initialTasks) {
      await client.query(
        `INSERT INTO compliance_tasks
         (organization_id, engagement_id, activity_code, title, priority, due_date, evidence_required, created_by)
         VALUES ($1, $2, $3, $4, $5, $6::date + (($3::int - 1) * INTERVAL '2 days'), TRUE, $7)`,
        [req.organization.id, engagementId, activityCode, title, priority, startsOn.toISOString().slice(0, 10), req.user.id]
      );
    }

    for (let month = 0; month < 12; month++) {
      const periodStart = new Date(Date.UTC(startsOn.getUTCFullYear(), startsOn.getUTCMonth() + month, 1));
      const periodEnd = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 0));
      await client.query(
        `INSERT INTO periodic_reviews
         (organization_id, engagement_id, review_type, period_start, period_end)
         VALUES ($1, $2, 'MONTHLY', $3, $4) ON CONFLICT DO NOTHING`,
        [req.organization.id, engagementId, periodStart.toISOString().slice(0, 10), periodEnd.toISOString().slice(0, 10)]
      );
      if (month % 3 === 2) {
        const quarterStart = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() - 2, 1));
        await client.query(
          `INSERT INTO periodic_reviews
           (organization_id, engagement_id, review_type, period_start, period_end)
           VALUES ($1, $2, 'QUARTERLY', $3, $4) ON CONFLICT DO NOTHING`,
          [req.organization.id, engagementId, quarterStart.toISOString().slice(0, 10), periodEnd.toISOString().slice(0, 10)]
        );
      }
    }
    await client.query(
      `INSERT INTO periodic_reviews
       (organization_id, engagement_id, review_type, period_start, period_end)
       VALUES ($1, $2, 'ANNUAL', $3, $4) ON CONFLICT DO NOTHING`,
      [req.organization.id, engagementId, startsOn.toISOString().slice(0, 10), endsOn.toISOString().slice(0, 10)]
    );
    await client.query('COMMIT');
    res.status(201).json(updated.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error activating service engagement:', error.message);
    res.status(500).json({ error: 'No fue posible activar el servicio administrado.' });
  } finally {
    client.release();
  }
});

router.post('/contacts', requireOrganizationPermission('service.manage'), async (req: any, res) => {
  const { full_name, email, job_title, responsibility, is_primary } = req.body;
  if (!full_name || !email || !responsibility) {
    return res.status(400).json({ error: 'Nombre, correo y responsabilidad son obligatorios.' });
  }
  try {
    const result = await getDb().query(
      `INSERT INTO organization_contacts
       (organization_id, full_name, email, job_title, responsibility, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.organization.id, full_name, email, job_title || null, responsibility, is_primary === true]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error?.code === '23514') return res.status(400).json({ error: 'Responsabilidad inválida.' });
    res.status(500).json({ error: 'No fue posible registrar el contacto.' });
  }
});

router.get('/tasks', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  if (status && !validTaskStatuses.has(status)) return res.status(400).json({ error: 'Estado de tarea inválido.' });
  const result = await getDb().query(
    `SELECT * FROM compliance_tasks
      WHERE organization_id = $1 AND ($2::text IS NULL OR status = $2)
      ORDER BY due_date NULLS LAST, created_at`,
    [req.organization.id, status]
  );
  res.json(result.rows);
});

router.post('/tasks', requireOrganizationPermission('service.manage'), async (req: any, res) => {
  const { title, description, activity_code, cadence, priority, due_date, evidence_required } = req.body;
  if (!title) return res.status(400).json({ error: 'El título es obligatorio.' });
  try {
    const result = await getDb().query(
      `INSERT INTO compliance_tasks
       (organization_id, engagement_id, activity_code, title, description, cadence,
        priority, due_date, evidence_required, created_by)
       VALUES ($1, (SELECT id FROM service_engagements WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 1),
        $2, $3, $4, COALESCE($5, 'ONCE'), COALESCE($6, 'MEDIUM'), $7, $8, $9)
       RETURNING *`,
      [req.organization.id, activity_code || null, title, description || null, cadence || null, priority || null, due_date || null, evidence_required === true, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error?.code === '23514') return res.status(400).json({ error: 'Los valores de la tarea no son válidos.' });
    res.status(500).json({ error: 'No fue posible crear la tarea.' });
  }
});

router.patch('/tasks/:id', requireOrganizationPermission('service.manage'), async (req: any, res) => {
  const status = req.body.status ? String(req.body.status) : null;
  if (status && !validTaskStatuses.has(status)) return res.status(400).json({ error: 'Estado de tarea inválido.' });
  const result = await getDb().query(
    `UPDATE compliance_tasks SET
       status = COALESCE($1, status),
       blocking_reason = COALESCE($2, blocking_reason),
       due_date = COALESCE($3, due_date),
       completed_at = CASE WHEN $1 = 'COMPLETED' THEN CURRENT_TIMESTAMP WHEN $1 IS NOT NULL THEN NULL ELSE completed_at END,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 AND organization_id = $5 RETURNING *`,
    [status, req.body.blocking_reason || null, req.body.due_date || null, req.params.id, req.organization.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Tarea no encontrada.' });
  res.json(result.rows[0]);
});

router.post('/evidence', requireOrganizationPermission('evidence.write'), async (req: any, res) => {
  const { task_id, evidence_type, title, description, source_reference, content_hash, valid_from, valid_until,
    subject_type, subject_id } = req.body;
  if (!evidence_type || !title) return res.status(400).json({ error: 'Tipo y título de evidencia son obligatorios.' });
  try {
    const db = getDb();
    const subjects: Record<string, string> = {
      TASK: 'compliance_tasks', ROPA: 'ropa_inventory', RISK: 'risk_matrix',
      CONTROL: 'control_assessments', TRANSFER: 'international_transfers',
      DOCUMENT: 'documents', ARCO: 'arco_requests'
    };
    const normalizedSubject = subject_type ? String(subject_type).toUpperCase() : null;
    if ((normalizedSubject && !subject_id) || (!normalizedSubject && subject_id)) {
      return res.status(400).json({ error: 'Tipo y registro asociado deben informarse juntos.' });
    }
    if (normalizedSubject) {
      const table = subjects[normalizedSubject];
      if (!table) return res.status(400).json({ error: 'Tipo de registro asociado inválido.' });
      const owner = await db.query(`SELECT 1 FROM ${table} WHERE id = $1 AND organization_id = $2`, [subject_id, req.organization.id]);
      if (!owner.rowCount) return res.status(404).json({ error: 'El registro asociado no pertenece a la organización.' });
    }
    const result = await db.query(
      `INSERT INTO compliance_evidence
       (organization_id, task_id, evidence_type, title, description, source_reference,
        content_hash, valid_from, valid_until, uploaded_by, subject_type, subject_id)
       SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
       WHERE $2::uuid IS NULL OR EXISTS (
         SELECT 1 FROM compliance_tasks WHERE id = $2 AND organization_id = $1
       ) RETURNING *`,
      [req.organization.id, task_id || null, evidence_type, title, description || null,
        source_reference || null, content_hash || null, valid_from || null, valid_until || null,
        req.user.id, normalizedSubject, subject_id || null]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'La tarea asociada no existe.' });
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error?.code === '23514') return res.status(400).json({ error: 'Tipo de evidencia inválido.' });
    res.status(500).json({ error: 'No fue posible registrar la evidencia.' });
  }
});

router.get('/documents', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  try {
    const result = await getDb().query(
      `SELECT d.*, dv.version_number, dv.change_summary, dv.created_at AS version_created_at
         FROM documents d
         LEFT JOIN LATERAL (
           SELECT version_number, change_summary, created_at
             FROM document_versions WHERE document_id = d.id
            ORDER BY version_number DESC LIMIT 1
         ) dv ON TRUE
        WHERE d.organization_id = $1 AND d.is_active = TRUE
        ORDER BY d.document_type, d.created_at DESC`,
      [req.organization.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error loading managed documents:', error.message);
    res.status(500).json({ error: 'No fue posible cargar los documentos del expediente.' });
  }
});

router.post('/documents/generate', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const type = String(req.body.document_type || '') as ManagedDocumentType;
  if (!managedDocumentTypes.has(type)) return res.status(400).json({ error: 'Tipo de documento administrado inválido.' });
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const [organization, contact, ropa] = await Promise.all([
      client.query(`SELECT name, legal_name, tax_identifier FROM organizations WHERE id = $1`, [req.organization.id]),
      client.query(`SELECT full_name, email FROM organization_contacts WHERE organization_id = $1 AND active = TRUE ORDER BY is_primary DESC, created_at LIMIT 1`, [req.organization.id]),
      client.query(`SELECT process_name, purpose, legal_basis, data_categories, data_subject_categories AS data_subjects,
        recipients, retention_period, deletion_method,
        CASE WHEN cross_border_transfer THEN ARRAY['Transferencia internacional declarada']::text[] ELSE ARRAY[]::text[] END AS international_transfers
        FROM ropa_inventory WHERE organization_id = $1 AND status = 'confirmed' ORDER BY created_at`, [req.organization.id])
    ]);
    if (!organization.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Organización no encontrada.' });
    }
    const content = buildManagedDocument(type, {
      companyName: organization.rows[0].legal_name || organization.rows[0].name,
      taxIdentifier: organization.rows[0].tax_identifier,
      contactName: contact.rows[0]?.full_name,
      contactEmail: contact.rows[0]?.email,
      processes: ropa.rows.map((row: any) => ({
        ...row,
        data_categories: Array.isArray(row.data_categories) ? row.data_categories : []
      }))
    });
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    const engagement = await client.query(`SELECT id FROM service_engagements WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 1`, [req.organization.id]);
    let document = await client.query(
      `SELECT * FROM documents WHERE organization_id = $1 AND document_type = $2 AND is_active = TRUE ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [req.organization.id, type]
    );
    if (!document.rowCount) {
      document = await client.query(
        `INSERT INTO documents (client_id, organization_id, engagement_id, title, document_type, workflow_status, content_hash)
         VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6) RETURNING *`,
        [req.user.id, req.organization.id, engagement.rows[0]?.id || null, documentTitle(type), type, contentHash]
      );
    } else {
      document = await client.query(
        `UPDATE documents SET workflow_status = 'DRAFT', approved_by = NULL, approved_at = NULL,
          content_hash = $1 WHERE id = $2 AND organization_id = $3 RETURNING *`,
        [contentHash, document.rows[0].id, req.organization.id]
      );
    }
    const version = await client.query(
      `INSERT INTO document_versions (document_id, version_number, content, change_summary, author_id)
       VALUES ($1, COALESCE((SELECT MAX(version_number) + 1 FROM document_versions WHERE document_id = $1), 1), $2, $3, $4)
       RETURNING version_number`,
      [document.rows[0].id, content, req.body.change_summary || 'Borrador regenerado desde información empresarial confirmada.', req.user.id]
    );
    await client.query('COMMIT');
    res.status(201).json({ ...document.rows[0], version_number: version.rows[0].version_number });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error generating managed document:', error.message);
    res.status(500).json({ error: 'No fue posible generar el documento administrado.' });
  } finally {
    client.release();
  }
});

router.post('/documents/:id/review', requireOrganizationPermission('service.review'), async (req: any, res) => {
  const decision = String(req.body.decision || '');
  if (!['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ error: 'Decisión de revisión inválida.' });
  }
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const workflowStatus = decision === 'APPROVED' ? 'APPROVED' : decision === 'CHANGES_REQUESTED' ? 'IN_REVIEW' : 'DRAFT';
    const document = await client.query(
      `UPDATE documents SET workflow_status = $1,
         approved_by = CASE WHEN $2 = 'APPROVED' THEN $3::uuid ELSE NULL END,
         approved_at = CASE WHEN $2 = 'APPROVED' THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = $4 AND organization_id = $5 AND is_active = TRUE RETURNING *`,
      [workflowStatus, decision, req.user.id, req.params.id, req.organization.id]
    );
    if (!document.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Documento no encontrado.' });
    }
    await client.query(
      `INSERT INTO compliance_reviews (organization_id, subject_type, subject_id, decision, comments, reviewer_id)
       VALUES ($1, 'DOCUMENT', $2, $3, $4, $5)`,
      [req.organization.id, req.params.id, decision, req.body.comments || null, req.user.id]
    );
    await client.query('COMMIT');
    res.json(document.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'No fue posible registrar la revisión del documento.' });
  } finally {
    client.release();
  }
});

router.get('/arco', requireOrganizationPermission('arco.operate'), async (req: any, res) => {
  try {
    const result = await getDb().query(
      `SELECT id, domain, requester_name, requester_email, request_type, details,
              status, verification_status, due_date, assigned_membership_id,
              response_sent_at, resolved_at, created_at
         FROM arco_requests
        WHERE organization_id = $1
        ORDER BY due_date ASC, created_at ASC`,
      [req.organization.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error loading managed ARCO requests:', error.message);
    res.status(500).json({ error: 'No fue posible cargar las solicitudes ARCO+.' });
  }
});

router.patch('/arco/:id', requireOrganizationPermission('arco.operate'), async (req: any, res) => {
  const status = req.body.status ? String(req.body.status) : null;
  const verificationStatus = req.body.verification_status ? String(req.body.verification_status) : null;
  const allowedStatuses = new Set(['Pendiente', 'En Proceso', 'En Revisión', 'Resuelto', 'Escalado']);
  const allowedVerification = new Set(['NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED', 'EXEMPTED']);
  if (status && !allowedStatuses.has(status)) return res.status(400).json({ error: 'Estado ARCO+ inválido.' });
  if (verificationStatus && !allowedVerification.has(verificationStatus)) {
    return res.status(400).json({ error: 'Estado de verificación inválido.' });
  }
  try {
    const result = await getDb().query(
      `UPDATE arco_requests SET
         status = COALESCE($1, status),
         verification_status = COALESCE($2, verification_status),
         verified_at = CASE WHEN $2 = 'VERIFIED' THEN CURRENT_TIMESTAMP WHEN $2 IS NOT NULL THEN NULL ELSE verified_at END,
         assigned_membership_id = COALESCE($3, assigned_membership_id),
         response_content = COALESCE($4, response_content),
         response_sent_at = CASE WHEN $5::boolean = TRUE THEN CURRENT_TIMESTAMP ELSE response_sent_at END,
         closed_reason = COALESCE($6, closed_reason),
         resolved_at = CASE WHEN $1 = 'Resuelto' THEN CURRENT_TIMESTAMP WHEN $1 IS NOT NULL THEN NULL ELSE resolved_at END
       WHERE id = $7 AND organization_id = $8
       RETURNING *`,
      [
        status,
        verificationStatus,
        req.body.assigned_membership_id || null,
        req.body.response_content || null,
        req.body.mark_response_sent === true,
        req.body.closed_reason || null,
        req.params.id,
        req.organization.id
      ]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Solicitud ARCO+ no encontrada.' });
    res.json(result.rows[0]);
  } catch (error: any) {
    if (error?.code === '23503' || error?.code === '22P02') {
      return res.status(400).json({ error: 'La asignación indicada no es válida.' });
    }
    res.status(500).json({ error: 'No fue posible actualizar la solicitud ARCO+.' });
  }
});

export default router;
