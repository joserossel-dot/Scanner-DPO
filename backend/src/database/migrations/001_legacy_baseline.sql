-- Additive baseline for databases created before versioned migrations existed.
-- No rows are deleted or overwritten.
CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, company_name VARCHAR(255) NOT NULL, role VARCHAR(50) DEFAULT 'tenant', subscription_plan VARCHAR(100) DEFAULT 'Free', subscription_status VARCHAR(100) DEFAULT 'Inactive', reset_token VARCHAR(255), reset_token_expiry TIMESTAMP, sales_notes TEXT, sales_status VARCHAR(50) DEFAULT 'NEW', created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'tenant';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(100) DEFAULT 'Free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(100) DEFAULT 'Inactive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sales_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sales_status VARCHAR(50) DEFAULT 'NEW';

CREATE TABLE IF NOT EXISTS site_configs (domain VARCHAR(255) PRIMARY KEY, company_name VARCHAR(255) NOT NULL, policy_version VARCHAR(50) NOT NULL, policy_content JSONB NOT NULL, banner_title VARCHAR(255) NOT NULL, banner_description TEXT NOT NULL, api_key VARCHAR(255), updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS api_key VARCHAR(255);
ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS audit_reports (id SERIAL PRIMARY KEY, url TEXT NOT NULL, score INTEGER NOT NULL, severity_counts JSONB NOT NULL, findings JSONB NOT NULL, pages_analyzed JSONB, pages_skipped JSONB, action_plan JSONB, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS pages_analyzed JSONB;
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS pages_skipped JSONB;
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS action_plan JSONB;
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS consent_logs (id SERIAL PRIMARY KEY, domain VARCHAR(255) NOT NULL, ip_hash VARCHAR(255) NOT NULL, consent_types JSONB NOT NULL, user_agent TEXT, policy_version VARCHAR(50) NOT NULL, consent_token VARCHAR(255), timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE consent_logs ADD COLUMN IF NOT EXISTS consent_token VARCHAR(255);
ALTER TABLE consent_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE consent_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_consent_domain ON consent_logs(domain);
CREATE INDEX IF NOT EXISTS idx_consent_timestamp ON consent_logs(timestamp);
CREATE TABLE IF NOT EXISTS form_consent_logs (id SERIAL PRIMARY KEY, client_id VARCHAR(255) NOT NULL, user_identifier VARCHAR(255) NOT NULL, privacy_policy_accepted BOOLEAN NOT NULL, privacy_policy_version VARCHAR(50) NOT NULL, marketing_opt_in BOOLEAN NOT NULL, form_id VARCHAR(255) NOT NULL, ip_hash VARCHAR(255) NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS employee_trainings (id SERIAL PRIMARY KEY, client_id VARCHAR(255) NOT NULL, employee_name VARCHAR(255) NOT NULL, employee_email VARCHAR(255) NOT NULL, completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, declaration_accepted BOOLEAN NOT NULL, quiz_score INTEGER NOT NULL, status VARCHAR(20) NOT NULL);
CREATE TABLE IF NOT EXISTS training_materials (id SERIAL PRIMARY KEY, client_id VARCHAR(255) UNIQUE NOT NULL, presentation_url VARCHAR(500) NOT NULL, policy_text TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS arco_requests (id SERIAL PRIMARY KEY, domain VARCHAR(255) NOT NULL, requester_name VARCHAR(255) NOT NULL, requester_email VARCHAR(255) NOT NULL, request_type VARCHAR(50) NOT NULL, details TEXT NOT NULL, status VARCHAR(50) NOT NULL DEFAULT 'Pendiente', due_date TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, resolved_at TIMESTAMPTZ);
ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_arco_domain ON arco_requests(domain);
CREATE TABLE IF NOT EXISTS adequate_countries_reference (country_code VARCHAR(2) PRIMARY KEY, country_name VARCHAR(100) NOT NULL, is_adequate BOOLEAN NOT NULL, notes TEXT);
INSERT INTO adequate_countries_reference (country_code, country_name, is_adequate, notes) VALUES
  ('CL', 'Chile', TRUE, 'Origen y jurisdicción principal.'),
  ('ES', 'España', TRUE, 'Referencia heredada pendiente de revisión normativa.'),
  ('DE', 'Alemania', TRUE, 'Referencia heredada pendiente de revisión normativa.'),
  ('FR', 'Francia', TRUE, 'Referencia heredada pendiente de revisión normativa.'),
  ('IT', 'Italia', TRUE, 'Referencia heredada pendiente de revisión normativa.'),
  ('GB', 'Reino Unido', TRUE, 'Referencia heredada pendiente de revisión normativa.'),
  ('CA', 'Canadá', TRUE, 'Referencia heredada pendiente de revisión normativa.'),
  ('JP', 'Japón', TRUE, 'Referencia heredada pendiente de revisión normativa.'),
  ('NZ', 'Nueva Zelanda', TRUE, 'Referencia heredada pendiente de revisión normativa.'),
  ('US', 'Estados Unidos', FALSE, 'Requiere evaluación del mecanismo aplicable.')
ON CONFLICT (country_code) DO NOTHING;
CREATE TABLE IF NOT EXISTS international_transfers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), domain VARCHAR(255) NOT NULL, vendor_name VARCHAR(255) NOT NULL, destination_country VARCHAR(100) NOT NULL, data_categories JSONB NOT NULL, transfer_mechanism VARCHAR(50) NOT NULL, has_signed_scc BOOLEAN NOT NULL DEFAULT FALSE, signature_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', scc_document_url VARCHAR(500), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS signature_status VARCHAR(50) NOT NULL DEFAULT 'PENDING';
ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS security_incidents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), domain VARCHAR(255) NOT NULL, incident_title VARCHAR(255) NOT NULL, incident_date TIMESTAMPTZ NOT NULL, incident_type VARCHAR(50) NOT NULL, affected_data_categories JSONB NOT NULL, approx_affected_titulars INTEGER NOT NULL, description_and_effects TEXT NOT NULL, mitigation_measures TEXT NOT NULL, requires_agency_notification BOOLEAN NOT NULL DEFAULT FALSE, requires_titulars_notification BOOLEAN NOT NULL DEFAULT FALSE, agency_notified_at TIMESTAMPTZ, titulars_notified_at TIMESTAMPTZ, status VARCHAR(50) NOT NULL DEFAULT 'DETECTED', created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_incidents_domain ON security_incidents(domain);

CREATE TABLE IF NOT EXISTS leads (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), domain VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, score_detected INTEGER NOT NULL, status VARCHAR(50) DEFAULT 'NEW', sales_notes TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'NEW';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_notes TEXT;
CREATE TABLE IF NOT EXISTS privacy_policies (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE, company_rut VARCHAR(50) NOT NULL, address VARCHAR(255) NOT NULL, contact_email VARCHAR(255) NOT NULL, data_categories JSONB NOT NULL, purposes JSONB NOT NULL, retention_rules TEXT NOT NULL, policy_html TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS risk_matrix (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, process_name VARCHAR(255) NOT NULL, identified_risk TEXT NOT NULL, severity VARCHAR(50) NOT NULL, mitigation_control TEXT NOT NULL, status VARCHAR(50) NOT NULL DEFAULT 'IMPLEMENTED', created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS whistleblower_reports (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, incident_description TEXT NOT NULL, reported_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, status VARCHAR(50) NOT NULL DEFAULT 'PENDING');
CREATE TABLE IF NOT EXISTS ropa_inventory (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, process_name VARCHAR(255) NOT NULL, purpose TEXT NOT NULL, legal_basis VARCHAR(255) NOT NULL, data_categories JSONB NOT NULL, retention_period VARCHAR(255) NOT NULL, cross_border_transfer BOOLEAN NOT NULL DEFAULT FALSE, source VARCHAR(50) DEFAULT 'manual', status VARCHAR(50) DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE ropa_inventory ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
CREATE TABLE IF NOT EXISTS document_downloads (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, document_type VARCHAR(50) NOT NULL, content_hash VARCHAR(64) NOT NULL, disclaimer_version VARCHAR(20) NOT NULL, downloaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS implementation_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, finding_id VARCHAR(255) NOT NULL, finding_description TEXT NOT NULL, effort VARCHAR(50) NOT NULL, status VARCHAR(50) NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS documents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(255) NOT NULL, document_type VARCHAR(100) NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, is_active BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS document_versions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE, version_number INTEGER NOT NULL, content TEXT NOT NULL, change_summary TEXT, author_id UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
