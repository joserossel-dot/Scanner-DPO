import { NextFunction, Response } from 'express';
import { getDb } from '../database/db.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';

export interface OrganizationRequest extends AuthenticatedRequest {
  organization?: {
    id: string;
    membershipId: string;
    permissions: string[];
  };
}

const requestedOrganization = (req: OrganizationRequest): string | undefined => {
  const value = req.header('x-organization-id');
  return value?.trim() || undefined;
};

export async function resolveActiveOrganization(
  req: OrganizationRequest,
  res: Response,
  next: NextFunction
) {
  if (req.method === 'OPTIONS') return next();
  if (!req.user) return res.status(401).json({ error: 'Autenticación requerida.' });

  try {
    const selectedId = requestedOrganization(req);
    const result = await getDb().query(
      `SELECT om.id AS membership_id, om.organization_id,
              COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '{}') AS permissions
         FROM organization_memberships om
         JOIN organizations o ON o.id = om.organization_id AND o.status = 'active'
         LEFT JOIN membership_roles mr ON mr.membership_id = om.id
         LEFT JOIN role_permissions rp ON rp.role_id = mr.role_id
         LEFT JOIN permissions p ON p.id = rp.permission_id
        WHERE om.user_id = $1
          AND om.status = 'active'
          AND om.organization_id = COALESCE($2::uuid, (SELECT default_organization_id FROM users WHERE id = $1))
        GROUP BY om.id, om.organization_id`,
      [req.user.id, selectedId || null]
    );

    if (!result.rowCount) {
      return res.status(403).json({ error: 'No existe una membresía activa para la organización solicitada.' });
    }

    const row = result.rows[0];
    req.organization = {
      id: String(row.organization_id),
      membershipId: String(row.membership_id),
      permissions: Array.isArray(row.permissions) ? row.permissions : []
    };
    return next();
  } catch (error: any) {
    if (error?.code === '22P02') {
      return res.status(400).json({ error: 'El identificador de organización no es válido.' });
    }
    console.error('Error resolving active organization:', error?.message);
    return res.status(500).json({ error: 'No fue posible resolver la organización activa.' });
  }
}

export function requireOrganizationPermission(permission: string) {
  return (req: OrganizationRequest, res: Response, next: NextFunction) => {
    if (!req.organization) {
      return res.status(403).json({ error: 'No hay una organización activa.' });
    }
    if (!req.organization.permissions.includes(permission)) {
      return res.status(403).json({ error: 'La membresía no posee el permiso requerido.' });
    }
    return next();
  };
}
