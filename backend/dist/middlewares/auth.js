import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET environment variable is missing.');
    process.exit(1);
}
export function authenticateToken(req, res, next) {
    if (req.method === 'OPTIONS') {
        return next();
    }
    const authHeader = req.headers['authorization'];
    // Authorization header: Bearer <token>
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token de acceso no proporcionado. Autenticación requerida.' });
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Token de acceso inválido o expirado.' });
        }
        req.user = {
            id: decoded.id,
            email: decoded.email,
            company_name: decoded.company_name,
            role: decoded.role || 'tenant'
        };
        next();
    });
}
