ALTER TABLE audit_reports
  ADD COLUMN IF NOT EXISTS questionnaire_answers JSONB;

CREATE INDEX IF NOT EXISTS idx_audit_reports_questionnaire
  ON audit_reports(organization_id, created_at DESC)
  WHERE questionnaire_answers IS NOT NULL;
