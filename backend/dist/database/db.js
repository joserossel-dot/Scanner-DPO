import pg from 'pg';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
const { Pool } = pg;
// Mutable In-Memory database for local development fallback
const store = {
    users: [],
    config: {
        domain: 'localhost:3000',
        company_name: 'Mi Empresa Chile S.A.',
        policy_version: 'v1.0.0',
        policy_content: {
            representative: 'PrivacyTech Chile SpA',
            representative_email: 'contacto@privacytech.cl',
            purposes: 'Prestación de servicios SaaS, soporte técnico y mejora de la plataforma.',
            retention: '5 años desde el fin del contrato o revocación del consentimiento.',
            channels: 'Formulario ARCO+ del sitio web o al correo arco@privacytech.cl'
        },
        banner_title: 'Control de su Privacidad',
        banner_description: 'Utilizamos cookies esenciales y de terceros para asegurar el correcto funcionamiento del portal, análisis estadístico y marketing personalizado conforme a la Ley N° 21.719 de Chile.'
    },
    transfers: [
        { id: 'transfer-1', provider_name: 'Google Analytics', country: 'US', data_categories: ['Datos de navegación (cookies/IP)'], adequacy_status: 'No Adecuado', has_scc: false, has_dpa: false },
        { id: 'transfer-2', provider_name: 'Stripe Payment Gateway', country: 'US', data_categories: ['Datos financieros/tarjetas'], adequacy_status: 'No Adecuado', has_scc: true, has_dpa: true }
    ],
    incidents: [
        {
            id: 'incident-1',
            incident_title: 'Acceso no autorizado a BBDD de clientes',
            incident_date: new Date().toISOString(),
            incident_type: 'DATA_LEAK',
            affected_data_categories: ['Datos de Identidad (RUT, Claves de Acceso)'],
            approx_affected_titulars: 1500,
            description_and_effects: 'Fuga de credenciales expuestas en repositorio de desarrollo.',
            mitigation_measures: 'Rotación inmediata de llaves SSH, revocación de credenciales y parche de seguridad.',
            requires_agency_notification: true,
            requires_titulars_notification: true,
            status: 'DETECTED'
        }
    ],
    arco: [
        { id: 'arco-1', requester_name: 'María Paz González', requester_email: 'maria.paz@gmail.com', request_type: 'Acceso', request_details: 'Solicito acceso a mis registros de compras.', status: 'Ingresado', created_at: new Date().toISOString() }
    ],
    consentLogs: [
        { id: 1, user_cookie_id: 'cookie_sess_abc', ip_masked: '186.104.22.xxx', essential_accepted: true, analytical_accepted: true, marketing_accepted: false, created_at: new Date().toISOString() }
    ],
    reports: []
};
// Mock Pool that behaves like pg.Pool for local development
class MockPool {
    async connect() {
        return { release: () => { } };
    }
    async query(queryText, params = []) {
        const text = queryText.trim().replace(/\s+/g, ' ');
        // 1. DDL Queries - Always return success
        if (text.startsWith('CREATE TABLE') ||
            text.startsWith('INSERT INTO adequate_countries_reference') ||
            text.startsWith('ALTER TABLE') ||
            text.startsWith('CREATE INDEX')) {
            return { rows: [], rowCount: 1 };
        }
        // 2. Selects
        if (text.startsWith('SELECT 1 FROM site_configs')) {
            return { rows: [{ '1': 1 }], rowCount: 1 };
        }
        if (text.includes('FROM site_configs')) {
            return { rows: [store.config], rowCount: 1 };
        }
        if (text.includes('FROM adequate_countries_reference')) {
            return {
                rows: [
                    { country_code: 'CL', country_name: 'Chile', is_adequate: true, notes: 'Origen y jurisdicción principal.' },
                    { country_code: 'ES', country_name: 'España (UE/EEE)', is_adequate: true, notes: 'Adecuación por RGPD.' },
                    { country_code: 'DE', country_name: 'Alemania (UE/EEE)', is_adequate: true, notes: 'Adecuación por RGPD.' },
                    { country_code: 'US', country_name: 'Estados Unidos', is_adequate: false, notes: 'Requiere SCC.' }
                ],
                rowCount: 4
            };
        }
        if (text.includes('FROM international_transfers')) {
            return { rows: store.transfers, rowCount: store.transfers.length };
        }
        if (text.includes('FROM security_incidents')) {
            return { rows: store.incidents, rowCount: store.incidents.length };
        }
        if (text.includes('FROM consent_logs')) {
            return { rows: store.consentLogs, rowCount: store.consentLogs.length };
        }
        if (text.includes('FROM arco_requests')) {
            return { rows: store.arco, rowCount: store.arco.length };
        }
        if (text.includes('FROM audit_reports')) {
            // Find latest or list
            if (text.includes('ORDER BY created_at DESC LIMIT 1') && store.reports.length > 0) {
                return { rows: [store.reports[store.reports.length - 1]], rowCount: 1 };
            }
            return { rows: store.reports, rowCount: store.reports.length };
        }
        if (text.includes('FROM users')) {
            const email = params[0];
            const user = store.users.find(u => u.email === email);
            return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
        }
        // 3. Inserts & Mutations
        if (text.startsWith('INSERT INTO users')) {
            const newUser = {
                id: 'user-' + Math.random().toString(36).substring(2, 9),
                email: params[0],
                password_hash: params[1],
                company_name: params[2],
                created_at: new Date().toISOString()
            };
            store.users.push(newUser);
            return { rows: [newUser], rowCount: 1 };
        }
        if (text.startsWith('INSERT INTO international_transfers')) {
            // Params: domain, vendor_name, destination_country, data_categories, transfer_mechanism, has_signed_scc, scc_url
            const newTransfer = {
                id: 'transfer-' + Math.random().toString(36).substring(2, 9),
                provider_name: params[1],
                country: params[2],
                data_categories: typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3],
                transfer_mechanism: params[4],
                has_scc: params[5] || false,
                has_dpa: false,
                scc_url: params[6] || '',
                adequacy_status: 'No Adecuado'
            };
            store.transfers.push(newTransfer);
            return { rows: [newTransfer], rowCount: 1 };
        }
        if (text.startsWith('INSERT INTO security_incidents')) {
            // Params: domain, incident_title, incident_date, incident_type, affected_data_categories, approx_affected_titulars, description_and_effects, mitigation_measures, status, requires_agency_notification, requires_titulars_notification
            const newIncident = {
                id: 'incident-' + Math.random().toString(36).substring(2, 9),
                incident_title: params[1],
                incident_date: params[2],
                incident_type: params[3],
                affected_data_categories: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4],
                approx_affected_titulars: params[5],
                description_and_effects: params[6],
                mitigation_measures: params[7],
                status: params[8] || 'DETECTED',
                requires_agency_notification: params[9] || false,
                requires_titulars_notification: params[10] || false
            };
            store.incidents.push(newIncident);
            return { rows: [newIncident], rowCount: 1 };
        }
        if (text.startsWith('INSERT INTO leads')) {
            const newLead = {
                id: 'lead-' + Math.random().toString(36).substring(2, 9),
                domain: params[0],
                email: params[1],
                score_detected: params[2],
                created_at: new Date().toISOString()
            };
            return { rows: [newLead], rowCount: 1 };
        }
        if (text.startsWith('INSERT INTO audit_reports')) {
            const newReport = {
                id: store.reports.length + 1,
                url: params[0],
                score: params[1],
                severity_counts: typeof params[2] === 'string' ? JSON.parse(params[2]) : params[2],
                findings: typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3],
                pages_analyzed: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4],
                pages_skipped: typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5]
            };
            store.reports.push(newReport);
            return { rows: [newReport], rowCount: 1 };
        }
        if (text.startsWith('INSERT INTO consent_logs')) {
            const newLog = {
                id: store.consentLogs.length + 1,
                user_cookie_id: 'cookie_sess_' + Math.random().toString(36).substring(2, 9),
                ip_masked: params[1],
                essential_accepted: true,
                analytical_accepted: params[2].analytical || false,
                marketing_accepted: params[2].marketing || false,
                created_at: new Date().toISOString()
            };
            store.consentLogs.push(newLog);
            return { rows: [newLog], rowCount: 1 };
        }
        // 4. Updates
        if (text.startsWith('UPDATE site_configs')) {
            // company_name = $1, policy_version = $2, banner_title = $3, banner_description = $4, policy_content = $5
            store.config.company_name = params[0];
            store.config.policy_version = params[1];
            store.config.banner_title = params[2];
            store.config.banner_description = params[3];
            store.config.policy_content = typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4];
            return { rows: [store.config], rowCount: 1 };
        }
        if (text.startsWith('UPDATE international_transfers')) {
            const id = params[params.length - 1];
            const trans = store.transfers.find(t => t.id === id);
            if (trans) {
                // Simple mock mapping for key updates
                if (text.includes('has_signed_scc =') || text.includes('has_scc =')) {
                    trans.has_scc = params[0];
                }
                if (text.includes('has_dpa =')) {
                    trans.has_dpa = params[1];
                }
            }
            return { rows: trans ? [trans] : [], rowCount: trans ? 1 : 0 };
        }
        if (text.startsWith('UPDATE security_incidents')) {
            const id = params[params.length - 1];
            const inc = store.incidents.find(i => i.id === id);
            if (inc) {
                if (text.includes('status =')) {
                    inc.status = params[0];
                }
            }
            return { rows: inc ? [inc] : [], rowCount: inc ? 1 : 0 };
        }
        // 5. Deletes
        if (text.startsWith('DELETE FROM international_transfers')) {
            const id = params[0];
            store.transfers = store.transfers.filter(t => t.id !== id);
            return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
    }
    async end() { }
}
let pool;
export async function initDb() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.log('⚠️ DATABASE_URL no configurada. Usando Base de Datos en Memoria (Mock) para desarrollo local.');
        pool = new MockPool();
        return pool;
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
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      company_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
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
    await pool.query(`
    ALTER TABLE international_transfers 
    ADD COLUMN IF NOT EXISTS signature_status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
  `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS security_incidents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      domain VARCHAR(255) NOT NULL REFERENCES site_configs(domain) ON DELETE CASCADE,
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
    console.log('✅ Tablas y esquema de PostgreSQL validados/creados.');
    return pool;
}
export function getDb() {
    if (!pool) {
        throw new Error('Database pool not initialized. Call initDb() first.');
    }
    return pool;
}
