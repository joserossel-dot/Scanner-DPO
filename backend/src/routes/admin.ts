import { Router } from 'express';
import cors from 'cors';
import { getDb } from '../database/db.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

const adminCors = cors((req: any, callback: any) => {
  const origin = req.header('Origin');
  const host = req.header('Host');
  const allowedOrigins = [
    process.env.DASHBOARD_ORIGIN,
    'http://localhost:5173',
    'http://localhost:3000',
    host
  ].filter(Boolean);

  const isAllowed = !origin || allowedOrigins.some(allowed => 
    origin === allowed || 
    origin === `https://${allowed}` || 
    origin === `http://${allowed}`
  );

  let corsOptions;
  if (isAllowed || process.env.NODE_ENV !== 'production') {
    corsOptions = { origin: true, credentials: true };
  } else {
    corsOptions = { origin: false };
  }
  callback(null, corsOptions);
});

// OPTIONS pre-flight handler
router.options('*', adminCors);

// Middleware to check superadmin privileges
const requireSuperAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de Superadministrador.' });
  }
  next();
};

// GET /api/admin/tenants - Get all tenant organizations with CRM details (only superadmin)
router.get('/tenants', adminCors, authenticateToken, requireSuperAdmin, async (req: any, res) => {
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
        (SELECT COUNT(*)::int FROM ropa_inventory r WHERE r.user_id = u.id AND r.status = 'confirmed') as confirmed_ropa_count,
        (SELECT score FROM audit_reports a WHERE a.user_id = u.id ORDER BY a.created_at DESC LIMIT 1) as last_diagnostic_score
      FROM users u
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching tenants list:', error.message);
    res.status(500).json({ error: 'Error al consultar la lista de organizaciones registradas.' });
  }
});

// GET /api/admin/leads - Get all leads from free scan (only superadmin)
router.get('/leads', adminCors, authenticateToken, requireSuperAdmin, async (req: any, res) => {
  const db = getDb();
  try {
    const result = await db.query(
      `SELECT id, domain, email, score_detected, status, sales_notes, created_at FROM leads ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching leads list:', error.message);
    res.status(500).json({ error: 'Error al consultar la lista de prospectos del escáner.' });
  }
});

// PUT /api/admin/leads/:id - Update lead sales status & notes (only superadmin)
router.put('/leads/:id', adminCors, authenticateToken, requireSuperAdmin, async (req: any, res) => {
  const db = getDb();
  const { id } = req.params;
  const { status, sales_notes } = req.body;
  try {
    const result = await db.query(
      `UPDATE leads SET status = $1, sales_notes = $2 WHERE id = $3 RETURNING *`,
      [status, sales_notes, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prospecto no encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating lead:', error.message);
    res.status(500).json({ error: 'Error al actualizar el prospecto.' });
  }
});

// PUT /api/admin/tenants/:id - Update tenant sales status, notes & subscription (only superadmin)
router.put('/tenants/:id', adminCors, authenticateToken, requireSuperAdmin, async (req: any, res) => {
  const db = getDb();
  const { id } = req.params;
  const { sales_status, sales_notes, subscription_plan, subscription_status } = req.body;
  try {
    const result = await db.query(
      `UPDATE users 
       SET sales_status = COALESCE($1, sales_status), 
           sales_notes = COALESCE($2, sales_notes),
           subscription_plan = COALESCE($3, subscription_plan),
           subscription_status = COALESCE($4, subscription_status)
       WHERE id = $5 RETURNING *`,
      [sales_status, sales_notes, subscription_plan, subscription_status, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Organización no encontrada.' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating tenant sales profile:', error.message);
    res.status(500).json({ error: 'Error al actualizar el perfil de la organización.' });
  }
});

export default router;
