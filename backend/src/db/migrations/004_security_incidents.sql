-- Migración 004: Módulo de Incidentes y Brechas de Seguridad (Art. 14 sexies)

CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL REFERENCES site_configs(domain) ON DELETE CASCADE,
  incident_title VARCHAR(255) NOT NULL,
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  incident_type VARCHAR(50) NOT NULL, -- DATA_LEAK, RANSOMWARE_HACK, LOST_DEVICE, UNAUTHORIZED_ACCESS, HUMAN_ERROR, OTHER
  affected_data_categories JSONB NOT NULL,
  approx_affected_titulars INTEGER NOT NULL,
  description_and_effects TEXT NOT NULL,
  mitigation_measures TEXT NOT NULL,
  requires_agency_notification BOOLEAN NOT NULL DEFAULT FALSE,
  requires_titulars_notification BOOLEAN NOT NULL DEFAULT FALSE,
  agency_notified_at TIMESTAMP WITH TIME ZONE,
  titulars_notified_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'DETECTED', -- DETECTED, UNDER_ANALYSIS, MITIGATED, REPORTED_AND_CLOSED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incidents_domain ON security_incidents(domain);
