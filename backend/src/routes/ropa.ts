import { Router } from 'express';
import cors from 'cors';
import { getDb } from '../database/db.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// CORS setup matching dashboard origins
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

// Protect all routes
router.use(authenticateToken);

// OPTIONS pre-flight handler
router.options('*', adminCors);

// GET /api/ropa - Get all processes in the RoPA inventory
router.get('/', adminCors, async (req: any, res) => {
  const db = getDb();
  try {
    const result = await db.query(
      'SELECT * FROM ropa_inventory WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching RoPA inventory:', error.message);
    res.status(500).json({ error: 'Error al consultar el inventario de actividades de tratamiento (RoPA).' });
  }
});

// POST /api/ropa - Add a new process to the RoPA inventory
router.post('/', adminCors, async (req: any, res) => {
  const { process_name, purpose, legal_basis, data_categories, retention_period, cross_border_transfer } = req.body;

  if (!process_name || !purpose || !legal_basis || !data_categories || !retention_period) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos para registrar la actividad.' });
  }

  const db = getDb();
  try {
    const result = await db.query(`
      INSERT INTO ropa_inventory (user_id, process_name, purpose, legal_basis, data_categories, retention_period, cross_border_transfer)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      req.user.id,
      process_name,
      purpose,
      legal_basis,
      JSON.stringify(data_categories),
      retention_period,
      cross_border_transfer === true
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating RoPA record:', error.message);
    res.status(500).json({ error: 'Error al registrar la actividad de tratamiento.' });
  }
});

// PUT /api/ropa/:id - Update an existing process in the RoPA inventory
router.put('/:id', adminCors, async (req: any, res) => {
  const { id } = req.params;
  const { process_name, purpose, legal_basis, data_categories, retention_period, cross_border_transfer } = req.body;

  if (!process_name || !purpose || !legal_basis || !data_categories || !retention_period) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos para actualizar la actividad.' });
  }

  const db = getDb();
  try {
    const result = await db.query(`
      UPDATE ropa_inventory 
      SET process_name = $1, purpose = $2, legal_basis = $3, data_categories = $4, retention_period = $5, cross_border_transfer = $6
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `, [
      process_name,
      purpose,
      legal_basis,
      JSON.stringify(data_categories),
      retention_period,
      cross_border_transfer === true,
      id,
      req.user.id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Actividad de tratamiento no encontrada.' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating RoPA record:', error.message);
    res.status(500).json({ error: 'Error al actualizar la actividad de tratamiento.' });
  }
});

// DELETE /api/ropa/:id - Delete a process from the RoPA inventory
router.delete('/:id', adminCors, async (req: any, res) => {
  const { id } = req.params;
  const db = getDb();
  try {
    const result = await db.query(
      'DELETE FROM ropa_inventory WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Actividad de tratamiento no encontrada.' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting RoPA record:', error.message);
    res.status(500).json({ error: 'Error al eliminar la actividad de tratamiento.' });
  }
});

export default router;
