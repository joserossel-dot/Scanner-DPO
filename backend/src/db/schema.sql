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
