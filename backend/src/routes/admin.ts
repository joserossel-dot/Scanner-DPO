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

// GET /api/admin/tenants - Get all tenant organizations (only superadmin)
router.get('/tenants', adminCors, authenticateToken, requireSuperAdmin, async (req: any, res) => {
  const db = getDb();
  try {
    const result = await db.query(
      `SELECT id, email, role, subscription_plan, subscription_status, created_at FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching tenants list:', error.message);
    res.status(500).json({ error: 'Error al consultar la lista de organizaciones registradas.' });
  }
});

export default router;
