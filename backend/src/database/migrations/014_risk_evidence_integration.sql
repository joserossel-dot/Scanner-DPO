-- Traceable risk candidates derived from confirmed processing facts.
-- A candidate is an operational review prompt, never an automatic legal conclusion.

ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS candidate_key VARCHAR(180);
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS origin_type VARCHAR(40) NOT NULL DEFAULT 'MANUAL'
  CHECK (origin_type IN ('MANUAL', 'ROPA_SIGNAL', 'FLOW_SIGNAL'));
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS review_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW'
  CHECK (review_status IN ('PENDING_REVIEW', 'CONFIRMED', 'DISMISSED'));
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS review_frequency VARCHAR(80);
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE risk_matrix ADD COLUMN IF NOT EXISTS evidence_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
  CHECK (evidence_status IN ('PENDING', 'PARTIAL', 'VERIFIED', 'REJECTED', 'EXPIRED'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_candidate_org_key
  ON risk_matrix(organization_id, candidate_key) WHERE candidate_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risk_review_queue
  ON risk_matrix(organization_id, review_status, next_review_date);

ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS review_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW'
  CHECK (review_status IN ('PENDING_REVIEW', 'CONFIRMED', 'DISMISSED'));
ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS review_frequency VARCHAR(80);
ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS evidence_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
  CHECK (evidence_status IN ('PENDING', 'PARTIAL', 'VERIFIED', 'REJECTED', 'EXPIRED'));
ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
