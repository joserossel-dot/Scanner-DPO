import pg from 'pg';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
const { Pool } = pg;
let pool;
export async function initDb() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('La variable de entorno DATABASE_URL es obligatoria para conectar a Neon/PostgreSQL.');
    }
    // Auto-enable SSL for Neon connections or production environment
    const isNeonOrProd = process.env.NODE_ENV === 'production' || connectionString.includes('neon.tech');
    pool = new Pool({
        connectionString,
        ssl: isNeonOrProd ? { rejectUnauthorized: false } : false
    });
    // Test the connection
    const client = await pool.connect();
    console.log('🛡️ Conexión establecida con éxito con PostgreSQL (Neon)');
    client.release();
    // Create tables dynamically on startup if they do not exist
    // 1. Site Configurations table
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
            retention_time: '5 años desde el fin del contrato o revocación del consentimiento.',
            exercise_channels: 'Formulario ARCO+ del sitio web o al correo arco@privacytech.cl'
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
    // 2. Audit Reports table
    await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_reports (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL,
      score INTEGER NOT NULL,
      severity_counts JSONB NOT NULL,
      findings JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // 3. Consent Logs table
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
    // 4. ARCO Requests table
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
    // 5. Adequate Countries Reference table
    await pool.query(`
    CREATE TABLE IF NOT EXISTS adequate_countries_reference (
      country_code VARCHAR(2) PRIMARY KEY,
      country_name VARCHAR(100) NOT NULL,
      is_adequate BOOLEAN NOT NULL,
      notes TEXT
    )
  `);
    // Seed adequate countries
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
    // 6. International Transfers table
    await pool.query(`
    CREATE TABLE IF NOT EXISTS international_transfers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      domain VARCHAR(255) NOT NULL REFERENCES site_configs(domain) ON DELETE CASCADE,
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
    // Alter table to add signature_status if table already exists in production
    await pool.query(`
    ALTER TABLE international_transfers 
    ADD COLUMN IF NOT EXISTS signature_status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
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
