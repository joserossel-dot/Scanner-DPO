import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../database/db.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../services/emailService.js';
import rateLimit from 'express-rate-limit';
import { createRateLimitStore } from '../security/rateLimitStore.js';
import { deriveSessionVersion } from '../security/sessionVersion.js';

const router = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_AUTH_ERROR = 'Credenciales inválidas.';
const GENERIC_RESET_MESSAGE = 'Si el correo está registrado, recibirá instrucciones para restablecer su contraseña.';
const DUMMY_PASSWORD_HASH = '$2b$10$/7Orwsesf5IzSqCroSWn0ePbOVmkQyj7yDZDMHtLID1TyEcI0W/R2';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  store: createRateLimitStore('auth'),
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos. Intente nuevamente en 15 minutos.' }
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  store: createRateLimitStore('password-reset'),
  message: { error: 'Demasiadas solicitudes. Intente nuevamente más tarde.' }
});

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

export function validatePassword(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) return null;
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) return null;
  return value;
}

const JWT_SECRET: string = process.env.JWT_SECRET as string;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL ERROR: JWT_SECRET must contain at least 32 characters.');
  process.exit(1);
}

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = validatePassword(req.body?.password);
  const companyName = typeof req.body?.company_name === 'string' ? req.body.company_name.trim() : '';

  if (!email || !password || !companyName || companyName.length > 200) {
    return res.status(400).json({ error: 'Email, empresa y contraseña válidos son obligatorios. La contraseña debe tener entre 12 y 128 caracteres, mayúsculas, minúsculas y números.' });
  }

  try {
    const db = getDb();
    
    // Check if user already exists
    const userCheck = await db.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (userCheck.rowCount && userCheck.rowCount > 0) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return res.status(202).json({ success: true, message: 'La solicitud de registro fue procesada. Si ya existe una cuenta, puede iniciar sesión o recuperar su contraseña.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save user to DB (default role: 'tenant')
    const insertRes = await db.query(
      'INSERT INTO users (email, password_hash, company_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, company_name, role',
      [email, passwordHash, companyName, 'tenant']
    );

    const user = insertRes.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, company_name: user.company_name, role: user.role, sv: deriveSessionVersion(user.id, passwordHash, JWT_SECRET) },
      JWT_SECRET,
      { expiresIn: '8h', algorithm: 'HS256', issuer: 'scanner-dpo', audience: 'scanner-dpo-api' }
    );

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
  } catch (error: any) {
    console.error('Error during registration:', error.message);
    if (error?.code === '23505') {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return res.status(202).json({ success: true, message: 'La solicitud de registro fue procesada. Si ya existe una cuenta, puede iniciar sesión o recuperar su contraseña.' });
    }
    res.status(500).json({ error: 'Error interno en el registro.' });
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' && req.body.password.length <= 128
    ? req.body.password
    : null;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña válidos son obligatorios.' });
  }

  try {
    const db = getDb();

    // Find user
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];

    // Always execute a bcrypt comparison to reduce account enumeration by timing.
    const isMatch = await bcrypt.compare(password, user?.password_hash || DUMMY_PASSWORD_HASH);
    if (!user || !isMatch) {
      return res.status(401).json({ error: GENERIC_AUTH_ERROR });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, company_name: user.company_name, role: user.role, sv: deriveSessionVersion(user.id, user.password_hash, JWT_SECRET) },
      JWT_SECRET,
      { expiresIn: '8h', algorithm: 'HS256', issuer: 'scanner-dpo', audience: 'scanner-dpo-api' }
    );

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
  } catch (error: any) {
    console.error('Error during login:', error.message);
    res.status(500).json({ error: 'Error interno en el inicio de sesión.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', passwordResetRateLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return res.status(400).json({ error: 'El correo electrónico es requerido.' });
  }

  try {
    const db = getDb();

    // Find user
    const userRes = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!userRes.rowCount || userRes.rowCount === 0) {
      return res.json({ success: true, message: GENERIC_RESET_MESSAGE });
    }

    const userId = userRes.rows[0].id;

    // Generate random recovery token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    // Store in DB
    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [token, expiry, userId]
    );

    // Enviar correo de recuperación real o simulación
    try {
      await sendPasswordResetEmail(email, token);
    } catch (emailError: any) {
      // Do not expose delivery failures because they would reveal registered accounts.
      console.error('Password reset email delivery failed:', emailError.message);
    }

    res.json({
      success: true,
      message: GENERIC_RESET_MESSAGE
    });
  } catch (error: any) {
    console.error('Error in forgot-password:', error.message);
    res.status(500).json({ error: 'Error interno al procesar la solicitud.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', passwordResetRateLimiter, async (req, res) => {
  const token = typeof req.body?.token === 'string' && /^[a-f0-9]{64}$/.test(req.body.token) ? req.body.token : null;
  const password = validatePassword(req.body?.password);

  if (!token || !password) {
    return res.status(400).json({ error: 'Token válido y contraseña segura requeridos.' });
  }

  try {
    const db = getDb();

    // Verify token exists and is not expired
    const userRes = await db.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [token]
    );

    if (!userRes.rowCount || userRes.rowCount === 0) {
      return res.status(400).json({ error: 'El enlace de recuperación es inválido o ha expirado.' });
    }

    const userId = userRes.rows[0].id;

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update password and clear token
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
      [passwordHash, userId]
    );

    res.json({
      success: true,
      message: 'Su contraseña ha sido restablecida con éxito.'
    });
  } catch (error: any) {
    console.error('Error in reset-password:', error.message);
    res.status(500).json({ error: 'Error interno al restablecer la contraseña.' });
  }
});

export default router;
