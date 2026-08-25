ALTER TABLE consent_logs ADD COLUMN IF NOT EXISTS action VARCHAR(20) NOT NULL DEFAULT 'PREFERENCES_SAVED'
  CHECK (action IN ('PREFERENCES_SAVED', 'REVOKED'));
ALTER TABLE form_consent_logs ADD COLUMN IF NOT EXISTS action VARCHAR(20) NOT NULL DEFAULT 'PREFERENCES_SAVED'
  CHECK (action IN ('PREFERENCES_SAVED', 'REVOKED'));

ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS analysis_notes TEXT;
ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS response_channel VARCHAR(50);
ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS deadline_rule TEXT;
ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS deadline_reviewed_at TIMESTAMPTZ;
ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS deadline_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS arco_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  arco_request_id INTEGER NOT NULL REFERENCES arco_requests(id) ON DELETE CASCADE,
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN (
    'RECEIVED', 'IDENTITY_UPDATED', 'ANALYSIS_RECORDED', 'RESPONSE_RECORDED', 'CLOSED', 'ESCALATED'
  )),
  notes TEXT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_arco_events_request
  ON arco_request_events(organization_id, arco_request_id, created_at);

INSERT INTO arco_request_events (organization_id, arco_request_id, event_type, notes, metadata)
SELECT organization_id, id, 'RECEIVED', 'Solicitud incorporada al registro histórico.',
       jsonb_build_object('source', 'migration')
  FROM arco_requests ar
 WHERE organization_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM arco_request_events ev WHERE ev.arco_request_id = ar.id);
