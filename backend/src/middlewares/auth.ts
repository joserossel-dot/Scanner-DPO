import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123456';

// Extend Request interface to include user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    company_name: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  // Authorization header: Bearer <token>
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso no proporcionado. Autenticación requerida.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token de acceso inválido o expirado.' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      company_name: decoded.company_name
    };
    next();
  });
}
