import jwt from 'jsonwebtoken';
import { getDb } from '../database/db.js';
import { deriveSessionVersion, sessionVersionsMatch } from '../security/sessionVersion.js';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('FATAL ERROR: JWT_SECRET must contain at least 32 characters.');
    process.exit(1);
}
/** Verifies token policy and current credential state, then returns fresh authorization data. */
export async function verifyAccessToken(token) {
    const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'scanner-dpo',
        audience: 'scanner-dpo-api'
    });
    if (typeof decoded === 'string' || !['string', 'number'].includes(typeof decoded.id) || !decoded.id) {
        throw new Error('Invalid access token subject');
    }
    const userResult = await getDb().query('SELECT id, email, company_name, role, password_hash FROM users WHERE id = $1', [String(decoded.id)]);
    if (!userResult.rowCount)
        throw new Error('Access token user no longer exists');
    const user = userResult.rows[0];
    const expectedVersion = deriveSessionVersion(user.id, user.password_hash, JWT_SECRET);
    if (!sessionVersionsMatch(decoded.sv, expectedVersion))
        throw new Error('Access token session was revoked');
    return {
        id: String(user.id),
        email: user.email,
        company_name: user.company_name,
        role: user.role === 'superadmin' ? 'superadmin' : 'tenant'
    };
}
export async function authenticateToken(req, res, next) {
    if (req.method === 'OPTIONS') {
        return next();
    }
    const authHeader = req.headers.authorization;
    const bearerMatch = typeof authHeader === 'string' ? authHeader.match(/^Bearer\s+([^\s]+)$/i) : null;
    const token = bearerMatch?.[1];
    if (!token) {
        return res.status(401).json({ error: 'Token de acceso no proporcionado. Autenticación requerida.' });
    }
    try {
        req.user = await verifyAccessToken(token);
        return next();
    }
    catch {
        return res.status(401).json({ error: 'Token de acceso inválido o expirado.' });
    }
}
