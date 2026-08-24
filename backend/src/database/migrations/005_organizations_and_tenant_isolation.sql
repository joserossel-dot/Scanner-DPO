-- Additive, backwards-compatible organizational tenancy foundation.
-- Existing user_id/client_id/domain ownership remains available while routes migrate.

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  legal_name VARCHAR(255),
  tax_identifier VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended', 'revoked')),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS membership_roles (
  membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (membership_id, role_id)
);

INSERT INTO permissions (code, description) VALUES
  ('organization.manage', 'Administrar la organización y sus miembros'),
  ('compliance.read', 'Consultar información de cumplimiento'),
  ('compliance.write', 'Crear y modificar información de cumplimiento'),
  ('compliance.approve', 'Aprobar conclusiones y documentos'),
  ('evidence.read', 'Consultar evidencias'),
  ('evidence.write', 'Incorporar evidencias'),
  ('incidents.manage', 'Administrar incidentes de seguridad')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (code, name, description, is_system) VALUES
  ('organization_owner', 'Propietario de organización', 'Control total dentro de una organización', TRUE),
  ('compliance_manager', 'Responsable de cumplimiento', 'Gestiona el programa de cumplimiento', TRUE),
  ('process_owner', 'Dueño de proceso', 'Mantiene tratamientos y evidencias de sus procesos', TRUE),
  ('reviewer', 'Revisor', 'Revisa y aprueba información de cumplimiento', TRUE),
  ('viewer', 'Consulta', 'Acceso de solo lectura', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.code = 'organization_owner'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN (
  'compliance.read', 'compliance.write', 'compliance.approve',
  'evidence.read', 'evidence.write', 'incidents.manage'
)
WHERE r.code = 'compliance_manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN (
  'compliance.read', 'compliance.write', 'evidence.read', 'evidence.write'
)
WHERE r.code = 'process_owner'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN (
  'compliance.read', 'compliance.approve', 'evidence.read'
)
WHERE r.code = 'reviewer'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN ('compliance.read', 'evidence.read')
WHERE r.code = 'viewer'
ON CONFLICT DO NOTHING;

-- Deterministic one-organization-per-existing-user backfill. The legacy user role
-- remains authoritative until application routes adopt memberships.
INSERT INTO organizations (name, slug, created_by)
SELECT u.company_name, 'legacy-' || u.id::text, u.id
FROM users u
ON CONFLICT (slug) DO NOTHING;

INSERT INTO organization_memberships (organization_id, user_id, status, joined_at)
SELECT o.id, u.id, 'active', COALESCE(u.created_at, CURRENT_TIMESTAMP)
FROM users u
JOIN organizations o ON o.slug = 'legacy-' || u.id::text
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO membership_roles (membership_id, role_id)
SELECT om.id, r.id
FROM organization_memberships om
JOIN organizations o ON o.id = om.organization_id
JOIN roles r ON r.code = 'organization_owner'
WHERE o.slug = 'legacy-' || om.user_id::text
ON CONFLICT DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS default_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
UPDATE users u
SET default_organization_id = o.id
FROM organizations o
WHERE o.slug = 'legacy-' || u.id::text
  AND u.default_organization_id IS NULL;

-- Nullable during the compatibility window. New application writes should always
-- set organization_id; a later validated migration can make it NOT NULL.
ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE consent_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE privacy_policies ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE whistleblower_reports ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE document_downloads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE implementation_requests ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE form_consent_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE employee_trainings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE training_materials ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

UPDATE site_configs t SET organization_id = u.default_organization_id FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;
UPDATE audit_reports t SET organization_id = u.default_organization_id FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;
UPDATE consent_logs t SET organization_id = u.default_organization_id FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;
UPDATE arco_requests t SET organization_id = u.default_organization_id FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;
UPDATE international_transfers t SET organization_id = u.default_organization_id FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;
UPDATE security_incidents t SET organization_id = u.default_organization_id FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;
UPDATE privacy_policies t SET organization_id = u.default_organization_id FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;
UPDATE risk_matrix t SET organization_id = u.default_organization_id FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;
UPDATE whistleblower_reports t SET organization_id = u.default_organization_id FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;
UPDATE ropa_inventory t SET organization_id = u.default_organization_id FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;
UPDATE document_downloads t SET organization_id = u.default_organization_id FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;
UPDATE implementation_requests t SET organization_id = u.default_organization_id FROM users u WHERE t.user_id = u.id AND t.organization_id IS NULL;
UPDATE documents t SET organization_id = u.default_organization_id FROM users u WHERE t.client_id = u.id AND t.organization_id IS NULL;
UPDATE form_consent_logs t SET organization_id = u.default_organization_id FROM users u WHERE t.client_id = u.id::text AND t.organization_id IS NULL;
UPDATE employee_trainings t SET organization_id = u.default_organization_id FROM users u WHERE t.client_id = u.id::text AND t.organization_id IS NULL;
UPDATE training_materials t SET organization_id = u.default_organization_id FROM users u WHERE t.client_id = u.id::text AND t.organization_id IS NULL;

-- Domain-derived ownership is accepted only when every matching site
-- configuration belongs to exactly one organization. Shared domains remain
-- NULL for explicit reconciliation instead of being assigned arbitrarily.
WITH unambiguous_domains AS (
  SELECT domain, MIN(organization_id::text)::uuid AS organization_id
  FROM site_configs WHERE organization_id IS NOT NULL
  GROUP BY domain HAVING COUNT(DISTINCT organization_id) = 1
)
UPDATE consent_logs t SET organization_id = d.organization_id FROM unambiguous_domains d WHERE t.domain = d.domain AND t.organization_id IS NULL;
WITH unambiguous_domains AS (
  SELECT domain, MIN(organization_id::text)::uuid AS organization_id
  FROM site_configs WHERE organization_id IS NOT NULL
  GROUP BY domain HAVING COUNT(DISTINCT organization_id) = 1
)
UPDATE arco_requests t SET organization_id = d.organization_id FROM unambiguous_domains d WHERE t.domain = d.domain AND t.organization_id IS NULL;
WITH unambiguous_domains AS (
  SELECT domain, MIN(organization_id::text)::uuid AS organization_id
  FROM site_configs WHERE organization_id IS NOT NULL
  GROUP BY domain HAVING COUNT(DISTINCT organization_id) = 1
)
UPDATE international_transfers t SET organization_id = d.organization_id FROM unambiguous_domains d WHERE t.domain = d.domain AND t.organization_id IS NULL;
WITH unambiguous_domains AS (
  SELECT domain, MIN(organization_id::text)::uuid AS organization_id
  FROM site_configs WHERE organization_id IS NOT NULL
  GROUP BY domain HAVING COUNT(DISTINCT organization_id) = 1
)
UPDATE security_incidents t SET organization_id = d.organization_id FROM unambiguous_domains d WHERE t.domain = d.domain AND t.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_user ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_organization ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_configs_organization ON site_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_reports_organization ON audit_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_organization ON consent_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_arco_requests_organization ON arco_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfers_organization ON international_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_organization ON security_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_ropa_organization ON ropa_inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_organization ON documents(organization_id);

-- RLS is intentionally not enabled here: existing routes do not set tenant context.
-- Policies are installed as restrictive guards and become effective only when the
-- activation script enables RLS after application adoption.
DO $$
DECLARE
  tenant_table TEXT;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'site_configs', 'audit_reports', 'consent_logs', 'arco_requests',
    'international_transfers', 'security_incidents', 'privacy_policies',
    'risk_matrix', 'whistleblower_reports', 'ropa_inventory',
    'document_downloads', 'implementation_requests', 'documents',
    'form_consent_logs', 'employee_trainings', 'training_materials'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tenant_table);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::uuid) WITH CHECK (organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::uuid)',
      tenant_table
    );
  END LOOP;
END $$;
