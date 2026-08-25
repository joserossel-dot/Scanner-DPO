import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticateToken } from '../middlewares/auth.js';
import { resolveActiveOrganization, requireOrganizationPermission } from '../tenancy/organizationContext.js';

const router = Router();
router.use(authenticateToken, resolveActiveOrganization);

const entityConfig = {
  units: { table: 'organization_units', required: ['name'], fields: ['name', 'description', 'parent_unit_id', 'owner_contact_id'] },
  systems: { table: 'processing_systems', required: ['name'], fields: ['name', 'system_type', 'owner_contact_id', 'provider_name', 'hosting_countries', 'security_controls', 'description', 'status'] },
  parties: { table: 'external_parties', required: ['legal_name'], fields: ['legal_name', 'tax_identifier', 'party_roles', 'countries', 'contact_name', 'contact_email', 'contract_reference', 'data_processing_terms_status'] }
} as const;

router.get('/catalog', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  const db = getDb();
  const org = req.organization.id;
  try {
    const [units, systems, parties, contacts] = await Promise.all([
      db.query('SELECT * FROM organization_units WHERE organization_id = $1 ORDER BY name', [org]),
      db.query('SELECT * FROM processing_systems WHERE organization_id = $1 ORDER BY name', [org]),
      db.query('SELECT * FROM external_parties WHERE organization_id = $1 ORDER BY legal_name', [org]),
      db.query('SELECT * FROM organization_contacts WHERE organization_id = $1 AND active = TRUE ORDER BY full_name', [org])
    ]);
    res.json({ units: units.rows, systems: systems.rows, parties: parties.rows, contacts: contacts.rows });
  } catch (error: any) {
    console.error('Error fetching data inventory catalog:', error.message);
    res.status(500).json({ error: 'Error al consultar el catálogo del inventario.' });
  }
});

router.post('/:entity(units|systems|parties)', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const config = entityConfig[req.params.entity as keyof typeof entityConfig];
  const missing = config.required.filter(field => !req.body[field]);
  if (missing.length) return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}.` });
  const fields = config.fields.filter(field => req.body[field] !== undefined);
  const values = fields.map(field => Array.isArray(req.body[field]) ? JSON.stringify(req.body[field]) : req.body[field]);
  const columns = ['organization_id', ...fields];
  try {
    const result = await getDb().query(
      `INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
      [req.organization.id, ...values]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error(`Error creating ${req.params.entity}:`, error.message);
    res.status(500).json({ error: 'Error al registrar el elemento del inventario.' });
  }
});

router.get('/flows', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  try {
    const result = await getDb().query(`
      SELECT f.*, r.process_name, ou.name AS organization_unit_name,
        ss.name AS source_system_name, ds.name AS destination_system_name,
        ep.legal_name AS external_party_name,
        COALESCE(json_agg(json_build_object('id', ce.id, 'title', ce.title, 'status', ce.verification_status))
          FILTER (WHERE ce.id IS NOT NULL), '[]') AS evidence
      FROM processing_data_flows f
      JOIN ropa_inventory r ON r.id = f.ropa_activity_id AND r.organization_id = f.organization_id
      LEFT JOIN organization_units ou ON ou.id = f.organization_unit_id
      LEFT JOIN processing_systems ss ON ss.id = f.source_system_id
      LEFT JOIN processing_systems ds ON ds.id = f.destination_system_id
      LEFT JOIN external_parties ep ON ep.id = f.external_party_id
      LEFT JOIN data_flow_evidence dfe ON dfe.flow_id = f.id
      LEFT JOIN compliance_evidence ce ON ce.id = dfe.evidence_id AND ce.organization_id = f.organization_id
      WHERE f.organization_id = $1
      GROUP BY f.id, r.process_name, ou.name, ss.name, ds.name, ep.legal_name
      ORDER BY f.updated_at DESC`, [req.organization.id]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching data flows:', error.message);
    res.status(500).json({ error: 'Error al consultar los flujos de datos.' });
  }
});

router.post('/flows', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const required = ['ropa_activity_id', 'direction', 'purpose', 'legal_basis', 'retention_period', 'deletion_method'];
  const missing = required.filter(field => !req.body[field]);
  if (missing.length) return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}.` });
  const fields = [
    'ropa_activity_id', 'organization_unit_id', 'source_system_id', 'destination_system_id', 'external_party_id',
    'direction', 'data_subject_categories', 'data_categories', 'data_sources', 'purpose', 'legal_basis',
    'legal_basis_rationale', 'recipient_roles', 'destination_countries', 'transfer_mechanism', 'transfer_safeguards',
    'retention_period', 'retention_trigger', 'deletion_method', 'security_controls', 'process_owner_contact_id',
    'technical_owner_contact_id', 'evidence_status', 'review_status', 'next_review_date'
  ].filter(field => req.body[field] !== undefined);
  const values = fields.map(field => Array.isArray(req.body[field]) ? JSON.stringify(req.body[field]) : req.body[field]);
  const db = getDb();
  try {
    const activity = await db.query('SELECT 1 FROM ropa_inventory WHERE id = $1 AND organization_id = $2', [req.body.ropa_activity_id, req.organization.id]);
    if (!activity.rowCount) return res.status(400).json({ error: 'La actividad RoPA no pertenece a la organización.' });
    const columns = ['organization_id', 'created_by', ...fields];
    const result = await db.query(
      `INSERT INTO processing_data_flows (${columns.join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
      [req.organization.id, req.user.id, ...values]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating data flow:', error.message);
    res.status(500).json({ error: 'Error al registrar el flujo de datos.' });
  }
});

router.post('/flows/:id/evidence/:evidenceId', requireOrganizationPermission('evidence.write'), async (req: any, res) => {
  try {
    const result = await getDb().query(`
      INSERT INTO data_flow_evidence (organization_id, flow_id, evidence_id, relevance_notes)
      SELECT $3, f.id, e.id, $4 FROM processing_data_flows f
      JOIN compliance_evidence e ON e.id = $2 AND e.organization_id = $3
      WHERE f.id = $1 AND f.organization_id = $3
      ON CONFLICT (flow_id, evidence_id) DO UPDATE SET relevance_notes = EXCLUDED.relevance_notes
      RETURNING *`, [req.params.id, req.params.evidenceId, req.organization.id, req.body.relevance_notes || null]);
    if (!result.rowCount) return res.status(404).json({ error: 'Flujo o evidencia no encontrados en la organización.' });
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error linking flow evidence:', error.message);
    res.status(500).json({ error: 'Error al vincular la evidencia.' });
  }
});

export default router;
