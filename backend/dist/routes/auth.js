import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../database/db.js';
import crypto from 'crypto';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET environment variable is missing.');
    process.exit(1);
}
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
        if (userCheck.rowCount && userCheck.rowCount > 0) {
            return res.status(400).json({ error: 'El correo electrónico ingresado ya está registrado.' });
        }
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        // Save user to DB (default role: 'tenant')
        const insertRes = await db.query('INSERT INTO users (email, password_hash, company_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, company_name, role', [email, passwordHash, company_name, 'tenant']);
        const user = insertRes.rows[0];
        // Generate JWT
        const token = jwt.sign({ id: user.id, email: user.email, company_name: user.company_name, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                company_name: user.company_name,
                role: user.role
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
        if (!userRes.rowCount || userRes.rowCount === 0) {
            return res.status(400).json({ error: 'Credenciales inválidas. Usuario no registrado.' });
        }
        const user = userRes.rows[0];
        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Credenciales inválidas. Contraseña incorrecta.' });
        }
        // =========================================================
        // // TODO: REEMPLAZAR POR EL CORREO DEL CEO
        // =========================================================
        const CEO_EMAIL = 'admin@privacytech.cl'; // Escriba aquí el correo de pruebas de administración
        if (user.email.toLowerCase() === CEO_EMAIL.toLowerCase() && user.role !== 'superadmin') {
            user.role = 'superadmin';
            await db.query('UPDATE users SET role = $1 WHERE id = $2', ['superadmin', user.id]);
            console.log(`[AUTH BYPASS] Rol actualizado automáticamente a superadmin para: ${user.email}`);
        }
        // Generate JWT
        const token = jwt.sign({ id: user.id, email: user.email, company_name: user.company_name, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                company_name: user.company_name,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ error: 'Error interno en el inicio de sesión: ' + error.message });
    }
});
// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'El correo electrónico es requerido.' });
    }
    try {
        const db = getDb();
        // Find user
        const userRes = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (!userRes.rowCount || userRes.rowCount === 0) {
            return res.status(400).json({ error: 'No existe ningún usuario registrado con ese correo.' });
        }
        const userId = userRes.rows[0].id;
        // Generate random recovery token
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000); // 1 hour
        // Store in DB
        await db.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [token, expiry, userId]);
        // Simular el envío del email con el enlace
        console.log(`[EMAIL SEND SIMULATION] Link de recuperación: http://localhost:5173/reset-password/${token}`);
        res.json({
            success: true,
            message: 'Se ha generado un enlace de recuperación. Revise la consola del servidor para ver el simulador.'
        });
    }
    catch (error) {
        console.error('Error in forgot-password:', error.message);
        res.status(500).json({ error: 'Error interno al procesar la solicitud: ' + error.message });
    }
});
// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ error: 'Token y contraseña requeridos.' });
    }
    try {
        const db = getDb();
        // Verify token exists and is not expired
        const userRes = await db.query('SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()', [token]);
        if (!userRes.rowCount || userRes.rowCount === 0) {
            return res.status(400).json({ error: 'El enlace de recuperación es inválido o ha expirado.' });
        }
        const userId = userRes.rows[0].id;
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        // Update password and clear token
        await db.query('UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2', [passwordHash, userId]);
        res.json({
            success: true,
            message: 'Su contraseña ha sido restablecida con éxito.'
        });
    }
    catch (error) {
        console.error('Error in reset-password:', error.message);
        res.status(500).json({ error: 'Error interno al restablecer la contraseña: ' + error.message });
    }
});
export default router;
