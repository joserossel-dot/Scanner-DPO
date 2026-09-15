import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticateToken } from '../middlewares/auth.js';
import { resolveActiveOrganization, requireOrganizationPermission } from '../tenancy/organizationContext.js';
import { deriveRiskCandidates } from '../services/riskCandidateService.js';
const router = Router();
// Protect all routes
router.use(authenticateToken);
router.use(resolveActiveOrganization);
// --- RISK MATRIX CRUD ---
// GET /api/dpo/risks - List risks for the authenticated user
router.get('/risks', requireOrganizationPermission('compliance.read'), async (req, res) => {
    const db = getDb();
    try {
        const result = await db.query(`SELECT r.*, oc.full_name AS owner_name,
        (SELECT COUNT(*)::int FROM compliance_evidence ce WHERE ce.organization_id = r.organization_id AND ce.subject_type = 'RISK' AND ce.subject_id = r.id) AS evidence_count,
        (SELECT COUNT(*)::int FROM compliance_evidence ce WHERE ce.organization_id = r.organization_id AND ce.subject_type = 'RISK' AND ce.subject_id = r.id AND ce.verification_status = 'VERIFIED') AS verified_evidence_count
       FROM risk_matrix r LEFT JOIN organization_contacts oc ON oc.id = r.owner_contact_id AND oc.organization_id = r.organization_id
       WHERE r.organization_id = $1 ORDER BY r.created_at DESC`, [req.organization.id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching risk matrix:', error.message);
        res.status(500).json({ error: 'Error al consultar la matriz de riesgos.' });
    }
});
// Synchronizes review candidates from confirmed RoPA/data-flow facts. The
// resulting rows remain PENDING_REVIEW and are not legal findings.
router.post('/risks/sync-candidates', requireOrganizationPermission('compliance.write'), async (req, res) => {
    const db = getDb();
    try {
        const source = await db.query(`SELECT r.id AS ropa_id, r.process_name, r.contains_sensitive_data, r.sensitive_data_categories,
              r.automated_decisions, r.cross_border_transfer,
              f.id AS flow_id, f.destination_countries, f.recipient_roles, f.security_controls,
              f.process_owner_contact_id, f.technical_owner_contact_id, f.evidence_status AS flow_evidence_status
         FROM ropa_inventory r
         LEFT JOIN processing_data_flows f ON f.organization_id = r.organization_id
          AND f.ropa_activity_id = r.id AND f.review_status = 'CONFIRMED'
        WHERE r.organization_id = $1 AND r.status = 'confirmed'`, [req.organization.id]);
        const candidates = deriveRiskCandidates(source.rows.map((row) => ({
            ropaId: row.ropa_id, processName: row.process_name,
            containsSensitiveData: row.contains_sensitive_data, sensitiveCategories: row.sensitive_data_categories,
            automatedDecisions: row.automated_decisions, crossBorderTransfer: row.cross_border_transfer,
            flowId: row.flow_id, destinationCountries: row.destination_countries, recipientRoles: row.recipient_roles,
            securityControls: row.security_controls, processOwnerContactId: row.process_owner_contact_id,
            technicalOwnerContactId: row.technical_owner_contact_id, flowEvidenceStatus: row.flow_evidence_status
        })));
        let created = 0;
        let refreshed = 0;
        for (const candidate of candidates) {
            const result = await db.query(`INSERT INTO risk_matrix
          (user_id, organization_id, process_name, identified_risk, severity, mitigation_control, status,
           ropa_activity_id, owner_contact_id, candidate_key, origin_type, source_snapshot,
           review_status, review_frequency, evidence_status)
         VALUES ($1,$2,$3,$4,'PRELIMINAR',$5,'PENDING_REVIEW',$6,$7,$8,$9,$10,'PENDING_REVIEW','ANNUAL',$11)
         ON CONFLICT (organization_id, candidate_key) WHERE candidate_key IS NOT NULL DO UPDATE SET
           process_name = EXCLUDED.process_name, identified_risk = EXCLUDED.identified_risk,
           mitigation_control = EXCLUDED.mitigation_control, source_snapshot = EXCLUDED.source_snapshot,
           owner_contact_id = COALESCE(risk_matrix.owner_contact_id, EXCLUDED.owner_contact_id),
           evidence_status = CASE WHEN risk_matrix.review_status = 'PENDING_REVIEW' THEN EXCLUDED.evidence_status ELSE risk_matrix.evidence_status END
         RETURNING (xmax = 0) AS inserted`, [req.user.id, req.organization.id, candidate.processName, candidate.identifiedRisk,
                candidate.mitigationControl, candidate.sourceSnapshot.ropa_activity_id, candidate.ownerContactId,
                candidate.candidateKey, candidate.originType, candidate.sourceSnapshot, candidate.evidenceStatus]);
            result.rows[0]?.inserted ? created++ : refreshed++;
        }
        res.json({ source: 'CONFIRMED_PROCESSING_FACTS', candidates: candidates.length, created, refreshed, legalConclusion: false });
    }
    catch (error) {
        console.error('Error synchronizing risk candidates:', error.message);
        res.status(500).json({ error: 'No fue posible sincronizar los riesgos candidatos.' });
    }
});
// POST /api/dpo/risks - Add new risk in the matrix
router.post('/risks', requireOrganizationPermission('compliance.write'), async (req, res) => {
    const { process_name, identified_risk, severity, mitigation_control, status, ropa_activity_id, asset, threat, vulnerability, scenario, inherent_probability, inherent_impact, residual_probability, residual_impact, treatment_decision, treatment_action, owner_contact_id, due_date } = req.body;
    if (!process_name || !identified_risk || !severity || !mitigation_control) {
        return res.status(400).json({ error: 'Todos los campos obligatorios del riesgo deben ser completados.' });
    }
    const db = getDb();
    try {
        const scores = [inherent_probability, inherent_impact, residual_probability, residual_impact]
            .filter(value => value !== undefined && value !== null);
        if (scores.some(value => !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 5)) {
            return res.status(400).json({ error: 'Las probabilidades e impactos deben ser enteros entre 1 y 5.' });
        }
        if (ropa_activity_id) {
            const activity = await db.query('SELECT 1 FROM ropa_inventory WHERE id = $1 AND organization_id = $2', [ropa_activity_id, req.organization.id]);
            if (!activity.rowCount)
                return res.status(400).json({ error: 'La actividad RoPA vinculada no pertenece a la organización.' });
        }
        if (owner_contact_id) {
            const owner = await db.query('SELECT 1 FROM organization_contacts WHERE id = $1 AND organization_id = $2', [owner_contact_id, req.organization.id]);
            if (!owner.rowCount)
                return res.status(400).json({ error: 'El responsable indicado no pertenece a la organización.' });
        }
        const result = await db.query(`INSERT INTO risk_matrix
       (user_id, organization_id, process_name, identified_risk, severity, mitigation_control, status,
        ropa_activity_id, asset, threat, vulnerability, scenario, inherent_probability, inherent_impact,
        residual_probability, residual_impact, treatment_decision, treatment_action, owner_contact_id, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`, [
            req.user.id,
            req.organization.id,
            process_name,
            identified_risk,
            severity,
            mitigation_control,
            status || 'IMPLEMENTED',
            ropa_activity_id || null,
            asset || null,
            threat || null,
            vulnerability || null,
            scenario || identified_risk,
            inherent_probability ?? null,
            inherent_impact ?? null,
            residual_probability ?? null,
            residual_impact ?? null,
            treatment_decision || null,
            treatment_action || null,
            owner_contact_id || null,
            due_date || null
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating risk entry:', error.message);
        res.status(500).json({ error: 'Error al insertar el riesgo en la matriz.' });
    }
});
// PUT /api/dpo/risks/:id - Update risk mitigation status or details
router.put('/risks/:id', requireOrganizationPermission('compliance.write'), async (req, res) => {
    const { id } = req.params;
    const { status, mitigation_control, residual_probability, residual_impact, treatment_decision, treatment_action, owner_contact_id, due_date, review_status, review_notes, review_frequency, next_review_date, evidence_status } = req.body;
    if (!status || !mitigation_control) {
        return res.status(400).json({ error: 'Campos incompletos en la solicitud de actualización.' });
    }
    const db = getDb();
    try {
        for (const score of [residual_probability, residual_impact]) {
            if (score !== undefined && score !== null && (!Number.isInteger(Number(score)) || Number(score) < 1 || Number(score) > 5)) {
                return res.status(400).json({ error: 'Las probabilidades e impactos deben ser enteros entre 1 y 5.' });
            }
        }
        if (owner_contact_id) {
            const owner = await db.query('SELECT 1 FROM organization_contacts WHERE id = $1 AND organization_id = $2', [owner_contact_id, req.organization.id]);
            if (!owner.rowCount)
                return res.status(400).json({ error: 'El responsable indicado no pertenece a la organización.' });
        }
        const result = await db.query(`UPDATE risk_matrix
       SET status = $1, mitigation_control = $2,
           residual_probability = COALESCE($3, residual_probability),
           residual_impact = COALESCE($4, residual_impact),
           treatment_decision = COALESCE($5, treatment_decision),
           treatment_action = COALESCE($6, treatment_action),
           owner_contact_id = COALESCE($7, owner_contact_id),
           due_date = COALESCE($8, due_date),
           review_status = COALESCE($9, review_status), review_notes = COALESCE($10, review_notes),
           review_frequency = COALESCE($11, review_frequency), next_review_date = COALESCE($12, next_review_date),
           evidence_status = COALESCE($13, evidence_status),
           reviewed_by = CASE WHEN $9 IN ('CONFIRMED','DISMISSED') THEN $14 ELSE reviewed_by END,
           reviewed_at = CASE WHEN $9 IN ('CONFIRMED','DISMISSED') THEN CURRENT_TIMESTAMP ELSE reviewed_at END
       WHERE id = $15 AND organization_id = $16
       RETURNING *`, [status, mitigation_control, residual_probability ?? null, residual_impact ?? null,
            treatment_decision || null, treatment_action || null, owner_contact_id || null,
            due_date || null, review_status || null, review_notes || null, review_frequency || null,
            next_review_date || null, evidence_status || null, req.user.id, id, req.organization.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Registro de riesgo no encontrado o sin permisos.' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating risk entry:', error.message);
        res.status(500).json({ error: 'Error al actualizar el riesgo en la matriz.' });
    }
});
// DELETE /api/dpo/risks/:id - Delete a risk from the matrix
router.delete('/risks/:id', requireOrganizationPermission('compliance.write'), async (req, res) => {
    const { id } = req.params;
    const db = getDb();
    try {
        const result = await db.query('DELETE FROM risk_matrix WHERE id = $1 AND organization_id = $2', [id, req.organization.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Registro no encontrado o sin permisos.' });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting risk entry:', error.message);
        res.status(500).json({ error: 'Error al eliminar el riesgo de la matriz.' });
    }
});
// --- VERSIONED CONTROL CATALOG AND ORGANIZATION ASSESSMENTS ---
router.get('/controls', requireOrganizationPermission('compliance.read'), async (req, res) => {
    try {
        const result = await getDb().query(`SELECT cd.id, cd.control_code, cd.title, cd.description, cd.evidence_guidance,
              cd.legal_reference, cd.interpretation_status,
              cc.framework_code, cc.framework_version, cc.jurisdiction, cc.source_url,
              ca.id AS assessment_id, ca.status AS assessment_status,
              ca.applicability_rationale, ca.assessment_notes, ca.owner_contact_id,
              ca.due_date, ca.assessed_at, ca.next_review_date, ca.review_status,
              ca.review_frequency, ca.evidence_status, ca.source_snapshot, ca.reviewed_at,
              (SELECT COUNT(*)::int FROM compliance_evidence ce WHERE ce.organization_id = $1 AND ce.subject_type = 'CONTROL' AND ce.subject_id = ca.id) AS evidence_count
         FROM control_definitions cd
         JOIN control_catalogs cc ON cc.id = cd.catalog_id AND cc.status = 'APPROVED'
         LEFT JOIN control_assessments ca ON ca.control_id = cd.id AND ca.organization_id = $1
        ORDER BY cc.framework_code, cd.control_code`, [req.organization.id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching control catalog:', error.message);
        res.status(500).json({ error: 'Error al consultar el catálogo de controles.' });
    }
});
router.put('/controls/:controlId/assessment', requireOrganizationPermission('compliance.write'), async (req, res) => {
    const assessmentStatus = String(req.body.status || '');
    const allowed = new Set(['NOT_ASSESSED', 'NOT_IMPLEMENTED', 'PARTIAL', 'IMPLEMENTED', 'NOT_APPLICABLE']);
    if (!allowed.has(assessmentStatus))
        return res.status(400).json({ error: 'Estado de evaluación inválido.' });
    try {
        const db = getDb();
        if (req.body.owner_contact_id) {
            const owner = await db.query('SELECT 1 FROM organization_contacts WHERE id = $1 AND organization_id = $2', [req.body.owner_contact_id, req.organization.id]);
            if (!owner.rowCount)
                return res.status(400).json({ error: 'El responsable indicado no pertenece a la organización.' });
        }
        const result = await db.query(`INSERT INTO control_assessments
       (organization_id, control_id, status, applicability_rationale, assessment_notes,
        owner_contact_id, due_date, assessed_by, assessed_at, next_review_date,
        review_status, review_frequency, evidence_status, source_snapshot, reviewed_by, reviewed_at)
       SELECT $1, cd.id, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9,
              $10, $11, $12, $13, CASE WHEN $10 IN ('CONFIRMED','DISMISSED') THEN $8 ELSE NULL END,
              CASE WHEN $10 IN ('CONFIRMED','DISMISSED') THEN CURRENT_TIMESTAMP ELSE NULL END
         FROM control_definitions cd
         JOIN control_catalogs cc ON cc.id = cd.catalog_id
        WHERE cd.id = $2 AND cc.status = 'APPROVED'
       ON CONFLICT (organization_id, control_id) DO UPDATE SET
         status = EXCLUDED.status,
         applicability_rationale = EXCLUDED.applicability_rationale,
         assessment_notes = EXCLUDED.assessment_notes,
         owner_contact_id = EXCLUDED.owner_contact_id,
         due_date = EXCLUDED.due_date,
         assessed_by = EXCLUDED.assessed_by,
         assessed_at = EXCLUDED.assessed_at,
         next_review_date = EXCLUDED.next_review_date,
         review_status = EXCLUDED.review_status,
         review_frequency = EXCLUDED.review_frequency,
         evidence_status = EXCLUDED.evidence_status,
         source_snapshot = EXCLUDED.source_snapshot,
         reviewed_by = EXCLUDED.reviewed_by,
         reviewed_at = EXCLUDED.reviewed_at,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`, [req.organization.id, req.params.controlId, assessmentStatus,
            req.body.applicability_rationale || null, req.body.assessment_notes || null,
            req.body.owner_contact_id || null, req.body.due_date || null, req.user.id,
            req.body.next_review_date || null, req.body.review_status || 'PENDING_REVIEW',
            req.body.review_frequency || null, req.body.evidence_status || 'PENDING',
            req.body.source_snapshot || {}]);
        if (!result.rowCount)
            return res.status(404).json({ error: 'Control aprobado no encontrado.' });
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error assessing control:', error.message);
        res.status(500).json({ error: 'Error al guardar la evaluación del control.' });
    }
});
// --- WHISTLEBLOWER CANAL ENDPOINTS ---
// GET /api/dpo/whistleblower - List reports for the authenticated user
router.get('/whistleblower', requireOrganizationPermission('compliance.read'), async (req, res) => {
    const db = getDb();
    try {
        const result = await db.query('SELECT * FROM whistleblower_reports WHERE organization_id = $1 ORDER BY reported_date DESC', [req.organization.id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching whistleblower inbox:', error.message);
        res.status(500).json({ error: 'Error al consultar la bandeja de denuncias.' });
    }
});
// POST /api/dpo/whistleblower - Create whistleblower report (for tests or wizard)
router.post('/whistleblower', requireOrganizationPermission('compliance.write'), async (req, res) => {
    const { incident_description, status } = req.body;
    if (!incident_description) {
        return res.status(400).json({ error: 'Falta proveer una descripción detallada de la denuncia.' });
    }
    const db = getDb();
    try {
        const result = await db.query(`INSERT INTO whistleblower_reports (user_id, organization_id, incident_description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [req.user.id, req.organization.id, incident_description, status || 'PENDING']);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating whistleblower report:', error.message);
        res.status(500).json({ error: 'Error al registrar la denuncia.' });
    }
});
// PATCH /api/dpo/whistleblower/:id/status - Change status of a whistleblower report
router.patch('/whistleblower/:id/status', requireOrganizationPermission('compliance.write'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !['PENDING', 'INVESTIGATING', 'RESOLVED'].includes(status)) {
        return res.status(400).json({ error: 'Estado de denuncia inválido.' });
    }
    const db = getDb();
    try {
        const result = await db.query(`UPDATE whistleblower_reports
       SET status = $1
       WHERE id = $2 AND organization_id = $3
       RETURNING *`, [status, id, req.organization.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Registro de denuncia no encontrado o sin permisos.' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating whistleblower status:', error.message);
        res.status(500).json({ error: 'Error al actualizar el estado de la denuncia.' });
    }
});
export default router;
