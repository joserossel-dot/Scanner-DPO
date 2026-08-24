import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticateToken } from '../middlewares/auth.js';
import { resolveActiveOrganization, requireOrganizationPermission } from '../tenancy/organizationContext.js';

const router = Router();

// Protect all routes
router.use(authenticateToken);
router.use(resolveActiveOrganization);

// --- RISK MATRIX CRUD ---

// GET /api/dpo/risks - List risks for the authenticated user
router.get('/risks', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  const db = getDb();
  try {
    const result = await db.query(
      'SELECT * FROM risk_matrix WHERE organization_id = $1 ORDER BY created_at DESC',
      [req.organization.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching risk matrix:', error.message);
    res.status(500).json({ error: 'Error al consultar la matriz de riesgos.' });
  }
});

// POST /api/dpo/risks - Add new risk in the matrix
router.post('/risks', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const { process_name, identified_risk, severity, mitigation_control, status } = req.body;

  if (!process_name || !identified_risk || !severity || !mitigation_control) {
    return res.status(400).json({ error: 'Todos los campos obligatorios del riesgo deben ser completados.' });
  }

  const db = getDb();
  try {
    const result = await db.query(
      `INSERT INTO risk_matrix (user_id, organization_id, process_name, identified_risk, severity, mitigation_control, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        req.organization.id,
        process_name,
        identified_risk,
        severity,
        mitigation_control,
        status || 'IMPLEMENTED'
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating risk entry:', error.message);
    res.status(500).json({ error: 'Error al insertar el riesgo en la matriz.' });
  }
});

// PUT /api/dpo/risks/:id - Update risk mitigation status or details
router.put('/risks/:id', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const { id } = req.params;
  const { status, mitigation_control } = req.body;

  if (!status || !mitigation_control) {
    return res.status(400).json({ error: 'Campos incompletos en la solicitud de actualización.' });
  }

  const db = getDb();
  try {
    const result = await db.query(
      `UPDATE risk_matrix
       SET status = $1, mitigation_control = $2
       WHERE id = $3 AND organization_id = $4
       RETURNING *`,
      [status, mitigation_control, id, req.organization.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Registro de riesgo no encontrado o sin permisos.' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating risk entry:', error.message);
    res.status(500).json({ error: 'Error al actualizar el riesgo en la matriz.' });
  }
});

// DELETE /api/dpo/risks/:id - Delete a risk from the matrix
router.delete('/risks/:id', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const { id } = req.params;
  const db = getDb();
  try {
    const result = await db.query(
      'DELETE FROM risk_matrix WHERE id = $1 AND organization_id = $2',
      [id, req.organization.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Registro no encontrado o sin permisos.' });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting risk entry:', error.message);
    res.status(500).json({ error: 'Error al eliminar el riesgo de la matriz.' });
  }
});

// --- WHISTLEBLOWER CANAL ENDPOINTS ---

// GET /api/dpo/whistleblower - List reports for the authenticated user
router.get('/whistleblower', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  const db = getDb();
  try {
    const result = await db.query(
      'SELECT * FROM whistleblower_reports WHERE organization_id = $1 ORDER BY reported_date DESC',
      [req.organization.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching whistleblower inbox:', error.message);
    res.status(500).json({ error: 'Error al consultar la bandeja de denuncias.' });
  }
});

// POST /api/dpo/whistleblower - Create whistleblower report (for tests or wizard)
router.post('/whistleblower', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const { incident_description, status } = req.body;

  if (!incident_description) {
    return res.status(400).json({ error: 'Falta proveer una descripción detallada de la denuncia.' });
  }

  const db = getDb();
  try {
    const result = await db.query(
      `INSERT INTO whistleblower_reports (user_id, organization_id, incident_description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, req.organization.id, incident_description, status || 'PENDING']
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating whistleblower report:', error.message);
    res.status(500).json({ error: 'Error al registrar la denuncia.' });
  }
});

// PATCH /api/dpo/whistleblower/:id/status - Change status of a whistleblower report
router.patch('/whistleblower/:id/status', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['PENDING', 'INVESTIGATING', 'RESOLVED'].includes(status)) {
    return res.status(400).json({ error: 'Estado de denuncia inválido.' });
  }

  const db = getDb();
  try {
    const result = await db.query(
      `UPDATE whistleblower_reports
       SET status = $1
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [status, id, req.organization.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Registro de denuncia no encontrado o sin permisos.' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating whistleblower status:', error.message);
    res.status(500).json({ error: 'Error al actualizar el estado de la denuncia.' });
  }
});

export default router;
