import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticateToken } from '../middlewares/auth.js';
const router = Router();
// Middleware to check superadmin privileges
const requireSuperAdmin = (req, res, next) => {
    if (req.user?.role !== 'superadmin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de Superadministrador.' });
    }
    next();
};
// GET /api/admin/tenants - Get all tenant organizations with CRM details (only superadmin)
router.get('/tenants', authenticateToken, requireSuperAdmin, async (req, res) => {
    const db = getDb();
    try {
        const result = await db.query(`
      SELECT 
        u.id, 
        u.email, 
        u.company_name,
        u.role, 
        u.subscription_plan, 
        u.subscription_status, 
        u.created_at,
        u.sales_notes,
        u.sales_status,
        u.default_organization_id,
        (SELECT COUNT(*)::int FROM ropa_inventory r WHERE r.user_id = u.id AND r.status = 'confirmed') as confirmed_ropa_count,
        (SELECT score FROM audit_reports a WHERE a.user_id = u.id ORDER BY a.created_at DESC LIMIT 1) as last_diagnostic_score
      FROM users u
      ORDER BY u.created_at DESC
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching tenants list:', error.message);
        res.status(500).json({ error: 'Error al consultar la lista de organizaciones registradas.' });
    }
});
router.get('/tenants/:id/service-members', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const result = await getDb().query(`SELECT u.id, u.email, u.company_name, om.status, r.code AS role_code, r.name AS role_name
         FROM users owner
         JOIN organization_memberships om_owner ON om_owner.organization_id = owner.default_organization_id
         JOIN organization_memberships om ON om.organization_id = om_owner.organization_id AND om.status = 'active'
         JOIN users u ON u.id = om.user_id
         LEFT JOIN membership_roles mr ON mr.membership_id = om.id
         LEFT JOIN roles r ON r.id = mr.role_id
        WHERE owner.id = $1 AND om_owner.user_id = owner.id
          AND r.code IN ('service_consultant', 'legal_reviewer', 'arco_operator')
        ORDER BY r.code, u.email`, [req.params.id]);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'No fue posible cargar el equipo del servicio.' });
    }
});
router.post('/tenants/:id/service-members', authenticateToken, requireSuperAdmin, async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const roleCode = String(req.body.role_code || '');
    if (!email || !['service_consultant', 'legal_reviewer', 'arco_operator'].includes(roleCode)) {
        return res.status(400).json({ error: 'Correo o rol de servicio inválido.' });
    }
    const client = await getDb().connect();
    try {
        await client.query('BEGIN');
        const target = await client.query(`SELECT id FROM users WHERE LOWER(email) = $1`, [email]);
        const tenant = await client.query(`SELECT default_organization_id FROM users WHERE id = $1`, [req.params.id]);
        const role = await client.query(`SELECT id FROM roles WHERE code = $1`, [roleCode]);
        if (!target.rowCount || !tenant.rows[0]?.default_organization_id || !role.rowCount) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Usuario, organización o rol no encontrado.' });
        }
        const membership = await client.query(`INSERT INTO organization_memberships (organization_id, user_id, status, joined_at)
       VALUES ($1, $2, 'active', CURRENT_TIMESTAMP)
       ON CONFLICT (organization_id, user_id) DO UPDATE SET joined_at = organization_memberships.joined_at
       RETURNING id`, [tenant.rows[0].default_organization_id, target.rows[0].id]);
        const membershipStatus = await client.query(`SELECT status FROM organization_memberships WHERE id = $1`, [membership.rows[0].id]);
        if (membershipStatus.rows[0]?.status !== 'active') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'La membresía existe pero no está activa; requiere una reactivación explícita.' });
        }
        await client.query(`INSERT INTO membership_roles (membership_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [membership.rows[0].id, role.rows[0].id]);
        await client.query('COMMIT');
        res.status(201).json({ success: true, user_id: target.rows[0].id, role_code: roleCode });
    }
    catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'No fue posible asignar el miembro del servicio.' });
    }
    finally {
        client.release();
    }
});
// GET /api/admin/leads - Get all leads from free scan (only superadmin)
router.get('/leads', authenticateToken, requireSuperAdmin, async (req, res) => {
    const db = getDb();
    try {
        const result = await db.query(`SELECT id, domain, email, score_detected, status, sales_notes, created_at FROM leads ORDER BY created_at DESC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching leads list:', error.message);
        res.status(500).json({ error: 'Error al consultar la lista de prospectos del escáner.' });
    }
});
// PUT /api/admin/leads/:id - Update lead sales status & notes (only superadmin)
router.put('/leads/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { status, sales_notes } = req.body;
    try {
        const result = await db.query(`UPDATE leads SET status = $1, sales_notes = $2 WHERE id = $3 RETURNING *`, [status, sales_notes, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Prospecto no encontrado.' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating lead:', error.message);
        res.status(500).json({ error: 'Error al actualizar el prospecto.' });
    }
});
// PUT /api/admin/tenants/:id - Update tenant sales status, notes & subscription (only superadmin)
router.put('/tenants/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { sales_status, sales_notes, subscription_plan, subscription_status } = req.body;
    try {
        const result = await db.query(`UPDATE users 
       SET sales_status = COALESCE($1, sales_status), 
           sales_notes = COALESCE($2, sales_notes),
           subscription_plan = COALESCE($3, subscription_plan),
           subscription_status = COALESCE($4, subscription_status)
       WHERE id = $5 RETURNING *`, [sales_status, sales_notes, subscription_plan, subscription_status, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Organización no encontrada.' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating tenant sales profile:', error.message);
        res.status(500).json({ error: 'Error al actualizar el perfil de la organización.' });
    }
});
export default router;
