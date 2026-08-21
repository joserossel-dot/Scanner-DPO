-- SQL Schema for PrivacyTech Law N° 21.719 SaaS
-- To be executed in the Neon / PostgreSQL console

-- 1. Site Configurations Table
CREATE TABLE IF NOT EXISTS site_configs (
  domain VARCHAR(255) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  policy_version VARCHAR(50) NOT NULL,
  policy_content JSONB NOT NULL, -- Representative, Email, Purposes, Retention, Channels
  banner_title VARCHAR(255) NOT NULL,
  banner_description TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default config for local dashboard connection
INSERT INTO site_configs (domain, company_name, policy_version, policy_content, banner_title, banner_description, updated_at)
VALUES (
  'localhost:3000',
  'Cliente de Prueba Local',
  'v1.0.0',
  '{"representative": "PrivacyTech Chile SpA", "representative_email": "contacto@privacytech.cl", "purposes": "Prestación de servicios SaaS, soporte técnico y mejora de la plataforma.", "retention_time": "5 años desde el fin del contrato o revocación del consentimiento.", "exercise_channels": "Formulario ARCO+ del sitio web o al correo arco@privacytech.cl"}',
  'Control de su Privacidad',
  'Utilizamos cookies esenciales y de terceros para asegurar el correcto funcionamiento del portal, análisis estadístico y marketing personalizado conforme a la Ley N° 21.719 de Chile.',
  CURRENT_TIMESTAMP
) ON CONFLICT (domain) DO NOTHING;

-- 2. Audit Reports Table
CREATE TABLE IF NOT EXISTS audit_reports (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  score INTEGER NOT NULL,
  severity_counts JSONB NOT NULL, -- {leve: N, grave: M, gravisima: K}
  findings JSONB NOT NULL, -- List of detailed findings
  pages_analyzed JSONB, -- List of crawled subpages
  pages_skipped JSONB, -- List of discovered but skipped subpages
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Consent Logs Table
CREATE TABLE IF NOT EXISTS consent_logs (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) NOT NULL,
  ip_hash VARCHAR(255) NOT NULL,
  consent_types JSONB NOT NULL, -- {essential: true, analytical: false, marketing: false}
  user_agent TEXT,
  policy_version VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for speed on consent analytics
CREATE INDEX IF NOT EXISTS idx_consent_domain ON consent_logs(domain);
CREATE INDEX IF NOT EXISTS idx_consent_timestamp ON consent_logs(timestamp);

-- 4. ARCO+ Requests Table
CREATE TABLE IF NOT EXISTS arco_requests (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  request_type VARCHAR(50) NOT NULL, -- Acceso, Rectificación, Supresión, Oposición, Portabilidad, Bloqueo
  details TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pendiente', -- Pendiente, En Proceso, Resuelto
  due_date TIMESTAMP WITH TIME ZONE NOT NULL, -- Legal deadline alert (30 calendar days or 2 business days)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_arco_domain ON arco_requests(domain);

-- 5. Adequate Countries Reference Table
CREATE TABLE IF NOT EXISTS adequate_countries_reference (
  country_code VARCHAR(2) PRIMARY KEY,
  country_name VARCHAR(100) NOT NULL,
  is_adequate BOOLEAN NOT NULL,
  notes TEXT
);

-- Seed adequate countries reference
INSERT INTO adequate_countries_reference (country_code, country_name, is_adequate, notes)
VALUES 
  ('CL', 'Chile', TRUE, 'Origen y jurisdicción principal de la Ley N° 21.719.'),
  ('ES', 'España (UE/EEE)', TRUE, 'Nivel adecuado por equivalencia RGPD de la Unión Europea.'),
  ('DE', 'Alemania (UE/EEE)', TRUE, 'Nivel adecuado por equivalencia RGPD de la Unión Europea.'),
  ('FR', 'Francia (UE/EEE)', TRUE, 'Nivel adecuado por equivalencia RGPD de la Unión Europea.'),
  ('IT', 'Italia (UE/EEE)', TRUE, 'Nivel adecuado por equivalencia RGPD de la Unión Europea.'),
  ('GB', 'Reino Unido', TRUE, 'Adecuación reconocida post-Brexit.'),
  ('CA', 'Canadá', TRUE, 'Reconocido bajo la Ley PIPEDA federal.'),
  ('JP', 'Japón', TRUE, 'Nivel adecuado por reconocimiento de adecuación recíproco.'),
  ('NZ', 'Nueva Zelanda', TRUE, 'Nivel de protección adecuado reconocido.'),
  ('US', 'Estados Unidos', FALSE, 'No adecuado de forma automática. Requiere firma de Cláusulas Contractuales Tipo (SCC).')
ON CONFLICT (country_code) DO NOTHING;

-- 6. International Transfers Table
CREATE TABLE IF NOT EXISTS international_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL REFERENCES site_configs(domain) ON DELETE CASCADE,
  vendor_name VARCHAR(255) NOT NULL,
  destination_country VARCHAR(100) NOT NULL,
  data_categories JSONB NOT NULL, -- Array of strings e.g. ["email", "phone"]
  transfer_mechanism VARCHAR(50) NOT NULL, -- ADEQUATE_COUNTRY, STANDARD_CLAUSES, BCR, CONSENT_EXCEPTIONAL, OTHER
  has_signed_scc BOOLEAN NOT NULL DEFAULT FALSE,
  signature_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, SIGNED
  scc_document_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Security Incidents Table (Art. 14 sexies)
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

-- 8. Document Versioning Tables
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  change_summary TEXT,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
