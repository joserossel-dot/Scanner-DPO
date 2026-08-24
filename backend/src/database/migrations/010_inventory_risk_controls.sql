-- Evidence-backed inventory, risk and control model.
-- This migration deliberately stores legal references as versioned metadata;
-- it does not seed legal conclusions or ISO control text.

ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS contains_sensitive_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS sensitive_data_categories JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS legal_basis_rationale TEXT;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS retention_legal_basis TEXT;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS security_measures JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS review_due_at DATE;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS automated_decisions BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS automated_decision_details TEXT;

ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS ropa_activity_id UUID REFERENCES ropa_inventory(id) ON DELETE SET NULL;
ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS legal_basis TEXT;
ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS safeguards JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS adequacy_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW'
  CHECK (adequacy_status IN ('PENDING_REVIEW', 'ADEQUATE', 'NOT_ADEQUATE', 'NOT_APPLICABLE'));
ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS assessment_source TEXT;
ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS assessment_version VARCHAR(80);
ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;
ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS review_due_at DATE;

ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS ropa_activity_id UUID REFERENCES ropa_inventory(id) ON DELETE SET NULL;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS asset TEXT;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS threat TEXT;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS vulnerability TEXT;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS scenario TEXT;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS inherent_probability SMALLINT CHECK (inherent_probability BETWEEN 1 AND 5);
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS inherent_impact SMALLINT CHECK (inherent_impact BETWEEN 1 AND 5);
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS residual_probability SMALLINT CHECK (residual_probability BETWEEN 1 AND 5);
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS residual_impact SMALLINT CHECK (residual_impact BETWEEN 1 AND 5);
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS treatment_decision VARCHAR(20)
  CHECK (treatment_decision IN ('MITIGATE', 'ACCEPT', 'AVOID', 'TRANSFER'));
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS treatment_action TEXT;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS owner_contact_id UUID REFERENCES organization_contacts(id) ON DELETE SET NULL;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS residual_approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS residual_approved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS control_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_code VARCHAR(80) NOT NULL,
  framework_version VARCHAR(80) NOT NULL,
  jurisdiction VARCHAR(80),
  title VARCHAR(255) NOT NULL,
  source_url TEXT,
  source_effective_from DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'APPROVED', 'RETIRED')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (framework_code, framework_version)
);

CREATE TABLE IF NOT EXISTS control_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID NOT NULL REFERENCES control_catalogs(id) ON DELETE CASCADE,
  control_code VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  evidence_guidance TEXT,
  legal_reference TEXT,
  interpretation_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (interpretation_status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'NOT_APPLICABLE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (catalog_id, control_code)
);

CREATE TABLE IF NOT EXISTS control_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES control_definitions(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'NOT_ASSESSED'
    CHECK (status IN ('NOT_ASSESSED', 'NOT_IMPLEMENTED', 'PARTIAL', 'IMPLEMENTED', 'NOT_APPLICABLE')),
  applicability_rationale TEXT,
  assessment_notes TEXT,
  owner_contact_id UUID REFERENCES organization_contacts(id) ON DELETE SET NULL,
  due_date DATE,
  assessed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assessed_at TIMESTAMPTZ,
  next_review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, control_id)
);

CREATE TABLE IF NOT EXISTS risk_control_links (
  risk_id UUID NOT NULL REFERENCES risk_matrix(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES control_assessments(id) ON DELETE CASCADE,
  contribution_notes TEXT,
  PRIMARY KEY (risk_id, assessment_id)
);

ALTER TABLE compliance_evidence ADD COLUMN IF NOT EXISTS subject_type VARCHAR(40)
  CHECK (subject_type IN ('TASK', 'ROPA', 'RISK', 'CONTROL', 'TRANSFER', 'DOCUMENT', 'ARCO'));
ALTER TABLE compliance_evidence ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE compliance_evidence ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
  CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'));
ALTER TABLE compliance_evidence ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE compliance_evidence ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ropa_review_due ON ropa_inventory(organization_id, review_due_at);
CREATE INDEX IF NOT EXISTS idx_transfer_ropa_activity ON international_transfers(organization_id, ropa_activity_id);
CREATE INDEX IF NOT EXISTS idx_risk_ropa_activity ON risk_matrix(organization_id, ropa_activity_id);
CREATE INDEX IF NOT EXISTS idx_control_assessment_org_status ON control_assessments(organization_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_evidence_subject ON compliance_evidence(organization_id, subject_type, subject_id);

DROP POLICY IF EXISTS tenant_isolation ON control_assessments;
CREATE POLICY tenant_isolation ON control_assessments
  USING (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid);
