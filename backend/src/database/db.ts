import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing.');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

export async function initDb() {
  // Test the connection
  const client = await pool.connect();
  console.log('🛡️ Conexión establecida con éxito con PostgreSQL (Neon)');
  client.release();

  // Create tables dynamically on startup if they do not exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      company_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'tenant',
      subscription_plan VARCHAR(100) DEFAULT 'Pro',
      subscription_status VARCHAR(100) DEFAULT 'Active',
      reset_token VARCHAR(255),
      reset_token_expiry TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure these columns exist in users table
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'tenant';
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(100) DEFAULT 'Pro';
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(100) DEFAULT 'Active';
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_configs (
      domain VARCHAR(255) PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL,
      policy_version VARCHAR(50) NOT NULL,
      policy_content JSONB NOT NULL,
      banner_title VARCHAR(255) NOT NULL,
      banner_description TEXT NOT NULL,
      api_key VARCHAR(255),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default client config if not exists
  const defaultDomain = 'localhost:3000';
  const configExists = await pool.query('SELECT 1 FROM site_configs WHERE domain = $1', [defaultDomain]);
  if (configExists.rowCount === 0) {
    const defaultPolicy = JSON.stringify({
      representative: 'PrivacyTech Chile SpA',
      representative_email: 'contacto@privacytech.cl',
      purposes: 'Prestación de servicios SaaS, soporte técnico y mejora de la plataforma.',
      retention: '5 años desde el fin del contrato o revocación del consentimiento.',
      channels: 'Formulario ARCO+ del sitio web o al correo arco@privacytech.cl'
    });
    await pool.query(`
      INSERT INTO site_configs (domain, company_name, policy_version, policy_content, banner_title, banner_description, api_key)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      defaultDomain,
      'Cliente de Prueba Local',
      'v1.0.0',
      defaultPolicy,
      'Control de su Privacidad',
      'Utilizamos cookies esenciales y de terceros para asegurar el correcto funcionamiento del portal, análisis estadístico y marketing personalizado conforme a la Ley N° 21.719 de Chile.',
      'pt_live_default_key_12345'
    ]);
  }

  // Create other tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_reports (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL,
      score INTEGER NOT NULL,
      severity_counts JSONB NOT NULL,
      findings JSONB NOT NULL,
      pages_analyzed JSONB,
      pages_skipped JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE audit_reports 
    ADD COLUMN IF NOT EXISTS pages_analyzed JSONB,
    ADD COLUMN IF NOT EXISTS pages_skipped JSONB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS consent_logs (
      id SERIAL PRIMARY KEY,
      domain VARCHAR(255) NOT NULL,
      ip_hash VARCHAR(255) NOT NULL,
      consent_types JSONB NOT NULL,
      user_agent TEXT,
      policy_version VARCHAR(50) NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS arco_requests (
      id SERIAL PRIMARY KEY,
      domain VARCHAR(255) NOT NULL,
      requester_name VARCHAR(255) NOT NULL,
      requester_email VARCHAR(255) NOT NULL,
      request_type VARCHAR(50) NOT NULL,
      details TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
      due_date TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP WITH TIME ZONE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS adequate_countries_reference (
      country_code VARCHAR(2) PRIMARY KEY,
      country_name VARCHAR(100) NOT NULL,
      is_adequate BOOLEAN NOT NULL,
      notes TEXT
    )
  `);

  await pool.query(`
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
    ON CONFLICT (country_code) DO NOTHING
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS international_transfers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      domain VARCHAR(255) NOT NULL,
      vendor_name VARCHAR(255) NOT NULL,
      destination_country VARCHAR(100) NOT NULL,
      data_categories JSONB NOT NULL,
      transfer_mechanism VARCHAR(50) NOT NULL,
      has_signed_scc BOOLEAN NOT NULL DEFAULT FALSE,
      signature_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      scc_document_url VARCHAR(500),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE international_transfers 
    ADD COLUMN IF NOT EXISTS signature_status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS security_incidents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      domain VARCHAR(255) NOT NULL,
      incident_title VARCHAR(255) NOT NULL,
      incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
      incident_type VARCHAR(50) NOT NULL,
      affected_data_categories JSONB NOT NULL,
      approx_affected_titulars INTEGER NOT NULL,
      description_and_effects TEXT NOT NULL,
      mitigation_measures TEXT NOT NULL,
      requires_agency_notification BOOLEAN NOT NULL DEFAULT FALSE,
      requires_titulars_notification BOOLEAN NOT NULL DEFAULT FALSE,
      agency_notified_at TIMESTAMP WITH TIME ZONE,
      titulars_notified_at TIMESTAMP WITH TIME ZONE,
      status VARCHAR(50) NOT NULL DEFAULT 'DETECTED',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_incidents_domain ON security_incidents(domain)
  `);

  // Alter existing tables to ensure they include user_id FK column for multi-tenancy
  await pool.query(`
    ALTER TABLE site_configs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  `);
  await pool.query(`
    ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  `);
  await pool.query(`
    ALTER TABLE consent_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  `);
  await pool.query(`
    ALTER TABLE arco_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  `);
  await pool.query(`
    ALTER TABLE international_transfers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  `);
  await pool.query(`
    ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      domain VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      score_detected INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS privacy_policies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      company_rut VARCHAR(50) NOT NULL,
      address VARCHAR(255) NOT NULL,
      contact_email VARCHAR(255) NOT NULL,
      data_categories JSONB NOT NULL,
      purposes JSONB NOT NULL,
      retention_rules TEXT NOT NULL,
      policy_html TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS risk_matrix (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      process_name VARCHAR(255) NOT NULL,
      identified_risk TEXT NOT NULL,
      severity VARCHAR(50) NOT NULL,
      mitigation_control TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'IMPLEMENTED',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS whistleblower_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      incident_description TEXT NOT NULL,
      reported_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ropa_inventory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      process_name VARCHAR(255) NOT NULL,
      purpose TEXT NOT NULL,
      legal_basis VARCHAR(255) NOT NULL,
      data_categories JSONB NOT NULL,
      retention_period VARCHAR(255) NOT NULL,
      cross_border_transfer BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Tablas y esquema de PostgreSQL validados/creados.');
  return pool;
}

export function getDb() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDb() first.');
  }
  return pool;
}
