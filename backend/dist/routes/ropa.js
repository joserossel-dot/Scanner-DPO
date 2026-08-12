import { Router } from 'express';
import cors from 'cors';
import { getDb } from '../database/db.js';
import { authenticateToken } from '../middlewares/auth.js';
import multer from 'multer';
import { OpenAI } from 'openai';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const router = Router();
// CORS setup matching dashboard origins
const adminCors = cors((req, callback) => {
    const origin = req.header('Origin');
    const host = req.header('Host');
    const allowedOrigins = [
        process.env.DASHBOARD_ORIGIN,
        'http://localhost:5173',
        'http://localhost:3000',
        host
    ].filter(Boolean);
    const isAllowed = !origin || allowedOrigins.some(allowed => origin === allowed ||
        origin === `https://${allowed}` ||
        origin === `http://${allowed}`);
    let corsOptions;
    if (isAllowed || process.env.NODE_ENV !== 'production') {
        corsOptions = { origin: true, credentials: true };
    }
    else {
        corsOptions = { origin: false };
    }
    callback(null, corsOptions);
});
// Protect all routes
router.use(authenticateToken);
// OPTIONS pre-flight handler
router.options('*', adminCors);
// GET /api/ropa - Get all processes in the RoPA inventory
router.get('/', adminCors, async (req, res) => {
    const db = getDb();
    try {
        const result = await db.query('SELECT * FROM ropa_inventory WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching RoPA inventory:', error.message);
        res.status(500).json({ error: 'Error al consultar el inventario de actividades de tratamiento (RoPA).' });
    }
});
// POST /api/ropa - Add a new process to the RoPA inventory
router.post('/', adminCors, async (req, res) => {
    const { process_name, purpose, legal_basis, data_categories, retention_period, cross_border_transfer, source, status } = req.body;
    if (!process_name || !purpose || !legal_basis || !data_categories || !retention_period) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos para registrar la actividad.' });
    }
    const db = getDb();
    try {
        const sourceVal = source || 'manual';
        const statusVal = status || 'confirmed';
        const result = await db.query(`
      INSERT INTO ropa_inventory (user_id, process_name, purpose, legal_basis, data_categories, retention_period, cross_border_transfer, source, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
            req.user.id,
            process_name,
            purpose,
            legal_basis,
            JSON.stringify(data_categories),
            retention_period,
            cross_border_transfer === true,
            sourceVal,
            statusVal
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating RoPA record:', error.message);
        res.status(500).json({ error: 'Error al registrar la actividad de tratamiento.' });
    }
});
// PUT /api/ropa/:id - Update an existing process in the RoPA inventory
router.put('/:id', adminCors, async (req, res) => {
    const { id } = req.params;
    const { process_name, purpose, legal_basis, data_categories, retention_period, cross_border_transfer, source, status } = req.body;
    if (!process_name || !purpose || !legal_basis || !data_categories || !retention_period) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos para actualizar la actividad.' });
    }
    const db = getDb();
    try {
        const sourceVal = source || 'manual';
        const statusVal = status || 'confirmed';
        const result = await db.query(`
      UPDATE ropa_inventory 
      SET process_name = $1, purpose = $2, legal_basis = $3, data_categories = $4, retention_period = $5, cross_border_transfer = $6, source = $7, status = $8
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `, [
            process_name,
            purpose,
            legal_basis,
            JSON.stringify(data_categories),
            retention_period,
            cross_border_transfer === true,
            sourceVal,
            statusVal,
            id,
            req.user.id
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Actividad de tratamiento no encontrada.' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating RoPA record:', error.message);
        res.status(500).json({ error: 'Error al actualizar la actividad de tratamiento.' });
    }
});
// DELETE /api/ropa/:id - Delete a process from the RoPA inventory
router.delete('/:id', adminCors, async (req, res) => {
    const { id } = req.params;
    const db = getDb();
    try {
        const result = await db.query('DELETE FROM ropa_inventory WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Actividad de tratamiento no encontrada.' });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting RoPA record:', error.message);
        res.status(500).json({ error: 'Error al eliminar la actividad de tratamiento.' });
    }
});
// POST /api/ropa/analyze-evidence - Analyze uploaded evidence (screenshot) using OpenAI Vision in memory
router.post('/analyze-evidence', adminCors, upload.single('evidence'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo de evidencia.' });
        }
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.warn('[PrivacyTech AI] OPENAI_API_KEY no configurada. Usando fallback simulado.');
            return res.json({
                categories: ["Identificatorios", "Financieros"],
                reasoning: "FALLBACK: No se encontró la clave de API de OpenAI. Se detectaron campos de RUT y Tarjeta en la imagen de prueba."
            });
        }
        const openai = new OpenAI({ apiKey });
        // Convert memory buffer directly to Base64 (descarta en RAM tras responder)
        const base64Data = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        const prompt = "Eres un auditor legal de la Ley 21.719 de Chile. Analiza la imagen adjunta (que es una interfaz de software o documento). Devuelve ÚNICAMENTE un objeto JSON estricto con dos propiedades: 'categories' (un array de strings eligiendo solo entre: ['Identificatorios', 'Financieros', 'Salud/Sensibles', 'Biométricos', 'NNA']) y 'reasoning' (una breve explicación de por qué detectaste esos datos). No devuelvas markdown, solo el JSON.";
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: dataUrl } }
                    ]
                }
            ],
            max_tokens: 300,
            response_format: { type: "json_object" }
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            return res.status(500).json({ error: 'Respuesta vacía de OpenAI.' });
        }
        const parsed = JSON.parse(content);
        return res.json(parsed);
    }
    catch (err) {
        console.error('Error in analyze-evidence:', err.message);
        res.status(550).json({ error: 'Error al procesar la evidencia mediante IA.' });
    }
});
export default router;
