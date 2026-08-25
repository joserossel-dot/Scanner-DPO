-- Security findings may be produced for any domain audited by the scanner.
-- A CMP site configuration is a separate concern and must not be required
-- before recording a preventive security incident.
ALTER TABLE security_incidents
  DROP CONSTRAINT IF EXISTS security_incidents_domain_fkey;

CREATE INDEX IF NOT EXISTS idx_incidents_domain
  ON security_incidents(domain);
