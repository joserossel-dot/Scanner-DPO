-- Managed-service workspace for the packaged SME compliance offering.
-- Additive only: existing operational modules continue to work while they are
-- progressively linked to the engagement and task model.

CREATE TABLE IF NOT EXISTS service_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(40) NOT NULL DEFAULT 'ELIGIBILITY_REVIEW'
    CHECK (status IN (
      'ELIGIBILITY_REVIEW', 'ACCEPTED', 'SPECIAL_ASSESSMENT', 'REJECTED',
      'ONBOARDING', 'DISCOVERY', 'VALIDATION', 'REMEDIATION_PLAN',
      'DOCUMENT_REVIEW', 'CLIENT_APPROVAL', 'INITIAL_DELIVERY',
      'MANAGED_SERVICE_ACTIVE', 'ANNUAL_REVIEW', 'RENEWED', 'CLOSED'
    )),
  service_tier VARCHAR(40) NOT NULL DEFAULT 'STANDARD'
    CHECK (service_tier IN ('STANDARD', 'STANDARD_WITH_ADDON', 'SPECIAL')),
  starts_on DATE,
  ends_on DATE,
  coordinator_membership_id UUID REFERENCES organization_memberships(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_service_engagement
  ON service_engagements(organization_id)
  WHERE status NOT IN ('REJECTED', 'CLOSED');

CREATE TABLE IF NOT EXISTS eligibility_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  engagement_id UUID REFERENCES service_engagements(id) ON DELETE CASCADE,
  employee_count INTEGER NOT NULL CHECK (employee_count >= 0),
  operates_in_chile BOOLEAN NOT NULL DEFAULT TRUE,
  industries JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision VARCHAR(40) NOT NULL
    CHECK (decision IN ('STANDARD', 'STANDARD_WITH_ADDON', 'SPECIAL_ASSESSMENT', 'NOT_ELIGIBLE')),
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  rules_version VARCHAR(40) NOT NULL,
  professional_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (professional_status IN ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED')),
  assessed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL,
  job_title VARCHAR(255),
  responsibility VARCHAR(60) NOT NULL
    CHECK (responsibility IN (
      'CLIENT_REPRESENTATIVE', 'CLIENT_COORDINATOR', 'PROCESS_OWNER',
      'TECHNICAL_OWNER', 'LEGAL_REVIEWER', 'ARCO_OPERATOR', 'OTHER'
    )),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  engagement_id UUID REFERENCES service_engagements(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES compliance_tasks(id) ON DELETE SET NULL,
  activity_code INTEGER CHECK (activity_code BETWEEN 1 AND 17),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cadence VARCHAR(20) NOT NULL DEFAULT 'ONCE'
    CHECK (cadence IN ('ONCE', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'EVENT_DRIVEN')),
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'APPROVED', 'COMPLETED', 'CANCELLED')),
  due_date DATE,
  assignee_membership_id UUID REFERENCES organization_memberships(id) ON DELETE SET NULL,
  evidence_required BOOLEAN NOT NULL DEFAULT FALSE,
  blocking_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id UUID REFERENCES compliance_tasks(id) ON DELETE SET NULL,
  evidence_type VARCHAR(40) NOT NULL
    CHECK (evidence_type IN ('DOCUMENT', 'SCREENSHOT', 'SYSTEM_RECORD', 'EMAIL', 'DECLARATION', 'LINK', 'OTHER')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  source_reference TEXT,
  content_hash VARCHAR(128),
  valid_from DATE,
  valid_until DATE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject_type VARCHAR(40) NOT NULL
    CHECK (subject_type IN ('ELIGIBILITY', 'TASK', 'DOCUMENT', 'ROPA', 'ARCO_RESPONSE', 'ANNUAL_REVIEW')),
  subject_id TEXT NOT NULL,
  decision VARCHAR(30) NOT NULL
    CHECK (decision IN ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'ESCALATED')),
  comments TEXT,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rules_version VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS periodic_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES service_engagements(id) ON DELETE CASCADE,
  review_type VARCHAR(20) NOT NULL CHECK (review_type IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED')),
  summary TEXT,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (engagement_id, review_type, period_start)
);

-- Compatibility links from the current modules into the managed-service core.
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES service_engagements(id) ON DELETE SET NULL;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS process_owner_contact_id UUID REFERENCES organization_contacts(id) ON DELETE SET NULL;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS systems JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS data_sources JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS data_subject_categories JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS recipients JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS deletion_method TEXT;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES service_engagements(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
  CHECK (workflow_status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'DELIVERED', 'PENDING_SIGNATURE', 'SIGNED', 'REPLACED', 'EXPIRED'));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_hash VARCHAR(128);

ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES service_engagements(id) ON DELETE SET NULL;
ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED'
  CHECK (verification_status IN ('NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED', 'EXEMPTED'));
ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS assigned_membership_id UUID REFERENCES organization_memberships(id) ON DELETE SET NULL;
ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS response_content TEXT;
ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS response_sent_at TIMESTAMPTZ;
ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS closed_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_engagements_organization ON service_engagements(organization_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_organization ON eligibility_assessments(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_organization ON organization_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_status ON compliance_tasks(organization_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_evidence_organization_task ON compliance_evidence(organization_id, task_id);
CREATE INDEX IF NOT EXISTS idx_reviews_organization_subject ON compliance_reviews(organization_id, subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_periodic_reviews_engagement ON periodic_reviews(engagement_id, period_start);
CREATE INDEX IF NOT EXISTS idx_ropa_engagement ON ropa_inventory(engagement_id);
CREATE INDEX IF NOT EXISTS idx_documents_engagement ON documents(engagement_id, workflow_status);
CREATE INDEX IF NOT EXISTS idx_arco_engagement ON arco_requests(engagement_id, due_date);

INSERT INTO permissions (code, description) VALUES
  ('service.manage', 'Administrar el expediente y el ciclo del servicio'),
  ('service.review', 'Revisar y aprobar entregables del servicio'),
  ('arco.operate', 'Operar solicitudes de derechos por cuenta de la organización')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.code = 'organization_owner'
  AND p.code IN ('service.manage', 'service.review', 'arco.operate')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN ('service.manage', 'arco.operate')
WHERE r.code = 'compliance_manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code = 'service.review'
WHERE r.code = 'reviewer'
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  tenant_table TEXT;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'service_engagements', 'eligibility_assessments', 'organization_contacts',
    'compliance_tasks', 'compliance_evidence', 'compliance_reviews', 'periodic_reviews'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tenant_table);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::uuid) WITH CHECK (organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::uuid)',
      tenant_table
    );
  END LOOP;
END $$;
