-- Separate client ownership from professional service review.

INSERT INTO roles (code, name, description, is_system) VALUES
  ('service_consultant', 'Consultor de servicio', 'Administra implementación, tareas y expediente', TRUE),
  ('legal_reviewer', 'Revisor legal o DPO', 'Revisa admisibilidad, documentos y respuestas', TRUE),
  ('arco_operator', 'Operador ARCO+', 'Gestiona solicitudes de titulares', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'compliance.read', 'compliance.write', 'evidence.read', 'evidence.write',
  'service.manage', 'arco.operate'
) WHERE r.code = 'service_consultant'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'compliance.read', 'compliance.approve', 'evidence.read', 'service.review'
) WHERE r.code = 'legal_reviewer'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
  'compliance.read', 'evidence.read', 'evidence.write', 'arco.operate'
) WHERE r.code = 'arco_operator'
ON CONFLICT DO NOTHING;

-- Owning the client organization does not constitute independent professional review.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id AND rp.permission_id = p.id
  AND r.code = 'organization_owner' AND p.code = 'service.review';
