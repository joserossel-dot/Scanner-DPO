import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../database/db.js';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123456';
// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { email, password, company_name } = req.body;
    if (!email || !password || !company_name) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios: email, password, company_name.' });
    }
    try {
        const db = getDb();
        // Check if user already exists
        const userCheck = await db.query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (userCheck.rowCount > 0) {
            return res.status(400).json({ error: 'El correo electrónico ingresado ya está registrado.' });
        }
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        // Save user to DB
        const insertRes = await db.query('INSERT INTO users (email, password_hash, company_name) VALUES ($1, $2, $3) RETURNING id, email, company_name', [email, passwordHash, company_name]);
        const user = insertRes.rows[0];
        // Generate JWT
        const token = jwt.sign({ id: user.id, email: user.email, company_name: user.company_name }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                company_name: user.company_name
            }
        });
    }
    catch (error) {
        console.error('Error during registration:', error.message);
        res.status(500).json({ error: 'Error interno en el registro: ' + error.message });
    }
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña obligatorios.' });
    }
    try {
        const db = getDb();
        // Find user
        const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userRes.rowCount === 0) {
            return res.status(400).json({ error: 'Credenciales inválidas. Usuario no registrado.' });
        }
        const user = userRes.rows[0];
        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Credenciales inválidas. Contraseña incorrecta.' });
        }
        // Generate JWT
        const token = jwt.sign({ id: user.id, email: user.email, company_name: user.company_name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                company_name: user.company_name
            }
        });
    }
    catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ error: 'Error interno en el inicio de sesión: ' + error.message });
    }
});
export default router;
