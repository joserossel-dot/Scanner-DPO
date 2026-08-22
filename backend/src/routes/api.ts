import { Router } from 'express';
import cors from 'cors';
import { getDb } from '../database/db.js';
import { runAudit } from '../services/crawlerService.js';
import { analyzeScanResults } from '../services/ropaDraftService.js';
import { authenticateToken } from '../middlewares/auth.js';
import { sendLeadAlert } from '../services/emailService.js';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET: string = process.env.JWT_SECRET as string;

// Rate limiters for public endpoints (P2-B)
const publicScanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Demasiados intentos de escaneo desde esta IP. Intente nuevamente en 15 minutos.' }
});

const publicArcoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Demasiados intentos de solicitudes ARCO+ desde esta IP. Intente nuevamente en 15 minutos.' }
});

// --- CORS CONFIGURATIONS ---
// Public endpoints (Widget CMP and ARCO Form): accessible from anywhere
const openCors = cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
});

// Admin endpoints (Client Dashboard): restricted to dashboard origins
const adminCors = cors((req: any, callback: any) => {
  const origin = (req.headers?.origin || req.headers?.Origin || '') as string;
  const host = (req.headers?.host || req.headers?.Host || '') as string;

  const allowedOrigins = [
    process.env.DASHBOARD_ORIGIN,
    'http://localhost:5173',
    'http://localhost:3000',
    host
  ].filter(Boolean) as string[];

  const isAllowed = !origin || allowedOrigins.some(allowed => 
    origin === allowed || 
    origin === `https://${allowed}` || 
    origin === `http://${allowed}`
  );

  let corsOptions;
  if (isAllowed || process.env.NODE_ENV !== 'production') {
    corsOptions = { origin: true, credentials: true };
  } else {
    corsOptions = { origin: false };
  }
  callback(null, corsOptions);
});

// Helper to parse JSON values safely
function safeParseJson(value: any) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// Helper to calculate business days
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) { // Skip Saturday/Sunday
      added++;
    }
  }
  return result;
}

// Enable OPTIONS pre-flight calls globally
router.options('*', cors());

// Dummy dashboard endpoint to resolve any ghost 404s
router.get('/dashboard', adminCors, (req: any, res) => {
  res.json({ success: true, message: "Dashboard API is active." });
});

// --- TESTING ENDPOINTS ---
if (process.env.NODE_ENV !== 'production') {
  router.delete('/testing/reset-my-data', adminCors, authenticateToken, async (req: any, res) => {
    const db = getDb();
    const userId = req.user.id;
    try {
      await db.query("DELETE FROM ropa_inventory WHERE user_id = $1", [userId]);
      await db.query("DELETE FROM audit_reports WHERE user_id = $1", [userId]);
      await db.query("DELETE FROM privacy_policies WHERE user_id = $1", [userId]);
      await db.query("DELETE FROM consent_logs WHERE user_id = $1", [userId]);
      await db.query("DELETE FROM arco_requests WHERE user_id = $1", [userId]);
      await db.query("DELETE FROM international_transfers WHERE user_id = $1", [userId]);
      await db.query("DELETE FROM security_incidents WHERE user_id = $1", [userId]);
      await db.query("DELETE FROM site_configs WHERE user_id = $1", [userId]);
      await db.query("DELETE FROM document_downloads WHERE user_id = $1", [userId]);

      res.json({ success: true, message: "Todos los datos de prueba han sido reseteados correctamente." });
    } catch (error: any) {
      console.error("Error resetting testing data:", error.message);
      res.status(500).json({ error: "Error al resetear los datos de prueba: " + error.message });
    }
  });
}

// --- ADMIN ENDPOINTS (Requires authenticateToken) ---

// 1. Audit Scan Endpoint
router.post('/scan', adminCors, authenticateToken, async (req: any, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Falta parámetro url' });
  }

  try {
    const report = await runAudit(url);
    const db = getDb();

    const result = await db.query(`
      INSERT INTO audit_reports (url, score, severity_counts, findings, pages_analyzed, pages_skipped, action_plan, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      report.url,
      report.score,
      JSON.stringify(report.severityCounts),
      JSON.stringify(report.findings),
      JSON.stringify(report.pagesAnalyzed || []),
      JSON.stringify(report.pagesSkipped || []),
      JSON.stringify(report.actionPlan || []),
      req.user.id
    ]);

    const reportId = result.rows[0].id;

    // Synchronously generate ROPA drafts from scan findings to prevent race conditions (P1-B)
    let ropaDraftsGenerated: any[] = [];
    try {
      await analyzeScanResults(req.user.id, report);
      const draftsRes = await db.query(
        "SELECT * FROM ropa_inventory WHERE user_id = $1 AND status = 'draft' ORDER BY created_at DESC",
        [req.user.id]
      );
      ropaDraftsGenerated = draftsRes.rows;
    } catch (err: any) {
      console.error('[RoPADraftService] Error in scan inference:', err.message);
    }

    return res.json({ id: reportId, ...report, ropaDraftsGenerated });
  } catch (error: any) {
    console.error('Error running scanner audit:', error.message);
    return res.status(422).json({ error: error.message });
  }
});

// 2. Get latest scan report for user
router.get('/scan/latest', adminCors, authenticateToken, async (req: any, res) => {
  try {
    const db = getDb();
    const result = await db.query(
      `SELECT * FROM audit_reports 
       WHERE user_id = $1 AND pages_analyzed IS NOT NULL AND pages_analyzed::text != '[]' 
       ORDER BY id DESC LIMIT 1`, 
      [req.user.id]
    );
    const latest = result.rows[0];
    if (!latest) {
      return res.json(null);
    }
    return res.json({
      id: latest.id,
      url: latest.url,
      score: latest.score,
      severityCounts: safeParseJson(latest.severity_counts),
      findings: safeParseJson(latest.findings),
      pagesAnalyzed: safeParseJson(latest.pages_analyzed) || [],
      pagesSkipped: safeParseJson(latest.pages_skipped) || [],
      created_at: latest.created_at
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Get history of scans for user
router.get('/scan/history', adminCors, authenticateToken, async (req: any, res) => {
  try {
    const db = getDb();
    const result = await db.query(
      `SELECT id, url, score, severity_counts, created_at 
       FROM audit_reports 
       WHERE user_id = $1 AND pages_analyzed IS NOT NULL AND pages_analyzed::text != '[]' 
       ORDER BY id DESC LIMIT 10`, 
      [req.user.id]
    );
    return res.json(result.rows.map((r: any) => ({
      id: r.id,
      url: r.url,
      score: r.score,
      severityCounts: safeParseJson(r.severity_counts),
      created_at: r.created_at
    })));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Consent Stats
router.get('/consents/stats', adminCors, authenticateToken, async (req: any, res) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT consent_types, timestamp FROM consent_logs WHERE domain IN (SELECT domain FROM site_configs WHERE user_id = $1) ORDER BY id DESC', [req.user.id]);
    const consents = result.rows;
    
    let essential = 0;
    let analytical = 0;
    let marketing = 0;
    let total = consents.length;

    consents.forEach((c: any) => {
      try {
        const types = safeParseJson(c.consent_types);
        if (types.essential) essential++;
        if (types.analytical) analytical++;
        if (types.marketing) marketing++;
      } catch {}
    });

    const timelineMap: { [date: string]: number } = {};
    consents.slice(0, 100).forEach((c: any) => {
      const dateStr = new Date(c.timestamp).toISOString().split('T')[0];
      timelineMap[dateStr] = (timelineMap[dateStr] || 0) + 1;
    });

    const timeline = Object.keys(timelineMap).map(date => ({
      date,
      count: timelineMap[date]
    })).sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      total,
      breakdown: {
        essential,
        analytical,
        marketing
      },
      timeline
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Raw Consent Logs
router.get('/consents/logs', adminCors, authenticateToken, async (req: any, res) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM consent_logs WHERE domain IN (SELECT domain FROM site_configs WHERE user_id = $1) ORDER BY id DESC LIMIT 50', [req.user.id]);
    return res.json(result.rows.map((r: any) => ({
      ...r,
      consent_types: safeParseJson(r.consent_types)
    })));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Get ARCO+ Tickets
router.get('/arco/tickets', adminCors, authenticateToken, async (req: any, res) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM arco_requests WHERE domain IN (SELECT domain FROM site_configs WHERE user_id = $1) ORDER BY id DESC', [req.user.id]);
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 7. Update ARCO+ Status
router.patch('/arco/tickets/:id/status', adminCors, authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Pendiente', 'En Proceso', 'Resuelto'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  try {
    const db = getDb();
    const resolvedAt = status === 'Resuelto' ? new Date().toISOString() : null;
    
    await db.query(`
      UPDATE arco_requests
      SET status = $1, resolved_at = $2
      WHERE id = $3 AND domain IN (SELECT domain FROM site_configs WHERE user_id = $4)
    `, [status, resolvedAt, id, req.user.id]);

    return res.json({ success: true, resolvedAt });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 8. Update Site Config (written by Admin Dashboard) - Generates B2B api_key if missing
router.put('/config/:domain', adminCors, authenticateToken, async (req: any, res) => {
  const { domain } = req.params;
  const { company_name, policy_version, policy_content, banner_title, banner_description } = req.body;

  if (!company_name || !policy_version || !policy_content || !banner_title || !banner_description) {
    return res.status(400).json({ error: 'Faltan parámetros de configuración obligatorios' });
  }

  try {
    const db = getDb();
    
    // Check if site config already has an api_key, otherwise generate one
    const currentConfig = await db.query('SELECT api_key FROM site_configs WHERE domain = $1', [domain]);
    let apiKey = currentConfig.rows[0]?.api_key;
    if (!apiKey) {
      apiKey = 'pt_live_' + crypto.randomBytes(16).toString('hex');
    }

    await db.query(`
      INSERT INTO site_configs (domain, company_name, policy_version, policy_content, banner_title, banner_description, updated_at, user_id, api_key)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8)
      ON CONFLICT (domain) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        policy_version = EXCLUDED.policy_version,
        policy_content = EXCLUDED.policy_content,
        banner_title = EXCLUDED.banner_title,
        banner_description = EXCLUDED.banner_description,
        updated_at = CURRENT_TIMESTAMP,
        user_id = EXCLUDED.user_id,
        api_key = COALESCE(site_configs.api_key, EXCLUDED.api_key)
    `, [
      domain,
      company_name,
      policy_version,
      JSON.stringify(policy_content),
      banner_title,
      banner_description,
      req.user.id,
      apiKey
    ]);

    return res.json({ success: true, api_key: apiKey });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/configs - List all configurations and B2B keys owned by the active tenant
router.get('/configs', adminCors, authenticateToken, async (req: any, res) => {
  const db = getDb();
  try {
    let result = await db.query(
      'SELECT domain, company_name, policy_version, banner_title, banner_description, api_key, updated_at FROM site_configs WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );

    if (!result.rowCount || result.rowCount === 0) {
      // Create a default domain configuration for the tenant so they always have an active domain
      const companyName = req.user.company_name || 'Mi Empresa';
      const cleanDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      const apiKey = 'pt_live_' + crypto.randomBytes(16).toString('hex');
      const defaultPolicy = {
        representative: 'Representante de Datos',
        representative_email: `privacidad@${cleanDomain}`,
        purposes: 'Finalidades del tratamiento declaradas en el portal.',
        retention_time: '24 meses.',
        exercise_channels: 'Formulario ARCO+ del sitio web.'
      };

      await db.query(`
        INSERT INTO site_configs (domain, company_name, policy_version, policy_content, banner_title, banner_description, updated_at, user_id, api_key)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8)
        ON CONFLICT (domain) DO NOTHING
      `, [
        cleanDomain,
        companyName,
        'v1.0.0',
        JSON.stringify(defaultPolicy),
        'Control de Cookies',
        'Utilizamos cookies esenciales para el funcionamiento del sitio, y cookies analíticas/comerciales opcionales conforme a la Ley N° 21.719.',
        req.user.id,
        apiKey
      ]);

      // Refetch after insertion
      result = await db.query(
        'SELECT domain, company_name, policy_version, banner_title, banner_description, api_key, updated_at FROM site_configs WHERE user_id = $1 ORDER BY updated_at DESC',
        [req.user.id]
      );
    }

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching site configs list:', error.message);
    res.status(500).json({ error: 'Error al consultar las configuraciones de sitio.' });
  }
});


// --- PUBLIC WIDGET ENDPOINTS (No authenticateToken) ---

// 9. Log Consent from Widget (Public) — identificador de visitante calculado en servidor
router.post('/remediation/consent-log', openCors, async (req, res) => {
  const { url, action, userAgent, consentTypes } = req.body;
  const domain = url ? new URL(url).hostname : 'localhost';

  // IP real vista por el servidor (no la que declare el cliente), hasheada con sal.
  // Nunca se guarda la IP en texto plano — solo el hash sirve para distinguir visitantes.
  const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown';
  const salt = process.env.CONSENT_HASH_SALT || 'dev_only_change_in_prod';
  const ipHash = crypto.createHash('sha256').update(rawIp + salt).digest('hex');

  // Si el widget manda categorías granulares (Cambio 2), se respetan.
  // Si es una versión vieja del widget que solo manda accept/reject, se cae al binario.
  const finalConsentTypes = consentTypes || {
    essential: true,
    analytical: action === 'accepted',
    marketing: action === 'accepted'
  };

  try {
    const db = getDb();

    // Versión real de la política vigente para ese dominio en este momento — nunca hardcodeada
    const configRes = await db.query(
      'SELECT policy_version FROM site_configs WHERE domain = $1',
      [domain]
    );
    const currentPolicyVersion = configRes.rows[0]?.policy_version || 'sin_version_registrada';

    await db.query(`
      INSERT INTO consent_logs (domain, ip_hash, consent_types, user_agent, policy_version)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      domain,
      ipHash,
      JSON.stringify(finalConsentTypes),
      userAgent || '',
      currentPolicyVersion
    ]);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 10. Submit ARCO+ Request from Widget (Public)
router.post('/arco', openCors, publicArcoLimiter, async (req, res) => {
  const { domain, requesterName, requesterEmail, requestType, details } = req.body;
  if (!domain || !requesterName || !requesterEmail || !requestType || !details) {
    return res.status(400).json({ error: 'Faltan campos requeridos para la solicitud ARCO+' });
  }

  try {
    const db = getDb();
    const now = new Date();
    let dueDate: Date;

    if (requestType === 'Bloqueo') {
      dueDate = addBusinessDays(now, 2);
    } else {
      dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 30);
    }

    const result = await db.query(`
      INSERT INTO arco_requests (domain, requester_name, requester_email, request_type, details, status, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING due_date
    `, [
      domain,
      requesterName,
      requesterEmail,
      requestType,
      details,
      'Pendiente',
      dueDate
    ]);

    return res.json({ success: true, dueDate: result.rows[0].due_date });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 11. Read Site Config (Public - Widget reads this)
router.get('/config/:domain', openCors, async (req, res) => {
  const { domain } = req.params;
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM site_configs WHERE domain = $1', [domain]);
    let config = result.rows[0];
    
    if (!config) {
      config = {
        domain,
        company_name: 'Nueva Empresa',
        policy_version: 'v1.0.0',
        policy_content: {
          representative: 'Representante de Datos',
          representative_email: `soporte@${domain}`,
          purposes: 'Finalidades del tratamiento por definir.',
          retention_time: 'Período razonable para cumplir las finalidades.',
          exercise_channels: 'Formulario de privacidad del sitio web.'
        },
        banner_title: 'Control de Cookies',
        banner_description: 'Configura tus cookies preferidas.'
      };
    } else {
      config.policy_content = safeParseJson(config.policy_content);
    }

    return res.json(config);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 12. Public free scanner endpoint for the Landing Page Lead Magnet (No Auth)
router.post('/free-scan', openCors, publicScanLimiter, async (req, res) => {
  const { domain, email } = req.body;
  if (!domain || !email) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios: domain y email.' });
  }

  try {
    const report = await runAudit(domain);
    const db = getDb();

    // Insert lead asynchronously
    db.query(`
      INSERT INTO leads (domain, email, score_detected)
      VALUES ($1, $2, $3)
    `, [domain, email, report.score]).then(() => {
      sendLeadAlert(domain, email, report.score).catch((err: any) => {
        console.error('Error sending lead alert email:', err.message);
      });
    }).catch((err: any) => {
      console.error('Error inserting lead asynchronously:', err.message);
    });

    return res.json(report);
  } catch (error: any) {
    console.error('Error running public free scan:', error.message);
    return res.status(422).json({ error: error.message });
  }
});

// 13. Public B2B Consent Collection (CORS flexible)
router.post('/consent/collect', cors({ origin: '*' }), async (req: any, res) => {
  const { client_id, domain: reqDomain, consent_token, preferences, userAgent, policyVersion } = req.body;
  const domain = reqDomain || client_id || 'localhost';

  // Get real IP
  const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown';
  const salt = process.env.CONSENT_HASH_SALT || 'dev_only_change_in_prod';
  const ipHash = crypto.createHash('sha256').update(rawIp + salt).digest('hex');

  // Compute consent token if not sent
  const finalToken = consent_token || crypto.createHash('md5').update(ipHash + domain).digest('hex');

  // Parse and map granular preferences (essential, analytics/analytical, marketing)
  const finalPreferences = preferences || req.body.consentTypes || {
    essential: true,
    analytical: false,
    marketing: false
  };

  if (finalPreferences.analytics !== undefined && finalPreferences.analytical === undefined) {
    finalPreferences.analytical = finalPreferences.analytics;
  }
  if (finalPreferences.analytical !== undefined && finalPreferences.analytics === undefined) {
    finalPreferences.analytics = finalPreferences.analytical;
  }

  try {
    const db = getDb();

    // Fetch dynamic policy version or use default/supplied
    const configRes = await db.query(
      'SELECT policy_version FROM site_configs WHERE domain = $1',
      [domain]
    );
    const currentPolicyVersion = policyVersion || configRes.rows[0]?.policy_version || 'sin_version_registrada';

    const result = await db.query(`
      INSERT INTO consent_logs (domain, ip_hash, consent_types, user_agent, policy_version, consent_token)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      domain,
      ipHash,
      JSON.stringify(finalPreferences),
      userAgent || req.headers['user-agent'] || '',
      currentPolicyVersion,
      finalToken
    ]);

    res.json({ success: true, log: result.rows[0] });
  } catch (error: any) {
    console.error('Error in consent collect route:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 14. Retrieve and Audit Consent Logs (Protected via authenticateToken or X-API-Key for B2B)
router.get('/consent/logs', adminCors, async (req: any, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: 'El parámetro client_id (dominio) es obligatorio.' });
  }

  const db = getDb();
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];

  let hasAccess = false;
  const targetDomain = client_id;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        
        // Verify tenant owns the requested domain
        const ownershipRes = await db.query(
          'SELECT 1 FROM site_configs WHERE domain = $1 AND user_id = $2',
          [targetDomain, req.user.id]
        );
        if (ownershipRes.rowCount && ownershipRes.rowCount > 0) {
          hasAccess = true;
        }
      } catch (err) {
        // Fall through
      }
    }
  }

  if (!hasAccess && apiKeyHeader) {
    // Verify API Key
    const apiKeyRes = await db.query(
      'SELECT 1 FROM site_configs WHERE domain = $1 AND api_key = $2',
      [targetDomain, apiKeyHeader]
    );
    if (apiKeyRes.rowCount && apiKeyRes.rowCount > 0) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    return res.status(401).json({ error: 'Acceso no autorizado. Se requiere token JWT válido o cabecera X-API-Key.' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM consent_logs WHERE domain = $1 ORDER BY id DESC LIMIT 100',
      [targetDomain]
    );
    return res.json(result.rows.map((r: any) => ({
      id: r.id,
      client_id: r.domain,
      domain: r.domain,
      ip_hash: r.ip_hash,
      consent_token: r.consent_token || '',
      preferences: safeParseJson(r.consent_types),
      consent_types: safeParseJson(r.consent_types),
      user_agent: r.user_agent,
      policy_version: r.policy_version,
      created_at: r.timestamp
    })));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 15. Public Form Consent Collection (CORS flexible)
router.post('/consent/form-collect', cors({ origin: '*' }), async (req: any, res) => {
  const { client_id, user_identifier, privacy_policy_accepted, privacy_policy_version, marketing_opt_in, form_id } = req.body;
  
  if (!client_id || !user_identifier || privacy_policy_accepted === undefined || marketing_opt_in === undefined) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios de consentimiento de formulario.' });
  }

  // Get real IP
  const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown';
  const salt = process.env.CONSENT_HASH_SALT || 'dev_only_change_in_prod';
  const ipHash = crypto.createHash('sha256').update(rawIp + salt).digest('hex');

  try {
    const db = getDb();
    
    // Fetch policy version from config if not supplied
    let currentPolicyVersion = privacy_policy_version;
    if (!currentPolicyVersion) {
      const configRes = await db.query(
        'SELECT policy_version FROM site_configs WHERE domain = $1',
        [client_id]
      );
      currentPolicyVersion = configRes.rows[0]?.policy_version || 'sin_version_registrada';
    }

    const result = await db.query(`
      INSERT INTO form_consent_logs (client_id, user_identifier, privacy_policy_accepted, privacy_policy_version, marketing_opt_in, form_id, ip_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      client_id,
      user_identifier,
      privacy_policy_accepted,
      currentPolicyVersion,
      marketing_opt_in,
      form_id || 'default_contact_form',
      ipHash
    ]);

    res.json({ success: true, log: result.rows[0] });
  } catch (error: any) {
    console.error('Error in form consent collect route:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 16. Retrieve Form Consent Logs (Protected via JWT or X-API-Key for B2B)
router.get('/consent/form-logs', adminCors, async (req: any, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: 'El parámetro client_id (dominio) es obligatorio.' });
  }

  const db = getDb();
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];

  let hasAccess = false;
  const targetDomain = client_id;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        
        // Verify tenant owns the requested domain
        const ownershipRes = await db.query(
          'SELECT 1 FROM site_configs WHERE domain = $1 AND user_id = $2',
          [targetDomain, req.user.id]
        );
        if (ownershipRes.rowCount && ownershipRes.rowCount > 0) {
          hasAccess = true;
        }
      } catch (err) {
        // Fall through
      }
    }
  }

  if (!hasAccess && apiKeyHeader) {
    // Verify API Key
    const apiKeyRes = await db.query(
      'SELECT 1 FROM site_configs WHERE domain = $1 AND api_key = $2',
      [targetDomain, apiKeyHeader]
    );
    if (apiKeyRes.rowCount && apiKeyRes.rowCount > 0) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    return res.status(401).json({ error: 'Acceso no autorizado. Se requiere token JWT válido o cabecera X-API-Key.' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM form_consent_logs WHERE client_id = $1 ORDER BY id DESC LIMIT 100',
      [targetDomain]
    );
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 17. Submit Employee Training Answers & Declaration (Public)
router.post('/training/submit', cors({ origin: '*' }), async (req: any, res) => {
  const { client_id, employee_name, employee_email, declaration_accepted, answers } = req.body;

  if (!client_id || !employee_name || !employee_email || declaration_accepted === undefined || !answers) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios para el registro de capacitación.' });
  }

  if (!declaration_accepted) {
    return res.status(400).json({ error: 'Debe aceptar la declaración jurada para completar la capacitación.' });
  }

  // Grade the quiz of 5 questions on the backend
  const CORRECT_ANSWERS = [1, 0, 1, 1, 1]; // Correct indices
  let score = 0;
  if (Array.isArray(answers)) {
    for (let i = 0; i < CORRECT_ANSWERS.length; i++) {
      if (Number(answers[i]) === CORRECT_ANSWERS[i]) {
        score++;
      }
    }
  }

  // Passing grade is >= 4 out of 5 (80%)
  const status = score >= 4 ? 'Aprobado' : 'Pendiente';

  try {
    const db = getDb();
    const result = await db.query(`
      INSERT INTO employee_trainings (client_id, employee_name, employee_email, declaration_accepted, quiz_score, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      client_id,
      employee_name,
      employee_email,
      declaration_accepted,
      score,
      status
    ]);

    return res.json({ 
      success: true, 
      score, 
      status, 
      passed: score >= 4,
      log: result.rows[0] 
    });
  } catch (error: any) {
    console.error('Error submitting employee training:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 18. Retrieve Employee Training Reports (Protected via JWT or X-API-Key for B2B)
router.get('/training/reports', adminCors, async (req: any, res) => {
  const { client_id } = req.query;
  if (!client_id) {
    return res.status(400).json({ error: 'El parámetro client_id (dominio) es obligatorio.' });
  }

  const db = getDb();
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];

  let hasAccess = false;
  const targetDomain = client_id;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        
        // Verify tenant owns the requested domain
        const ownershipRes = await db.query(
          'SELECT 1 FROM site_configs WHERE domain = $1 AND user_id = $2',
          [targetDomain, req.user.id]
        );
        if (ownershipRes.rowCount && ownershipRes.rowCount > 0) {
          hasAccess = true;
        }
      } catch (err) {
        // Fall through
      }
    }
  }

  if (!hasAccess && apiKeyHeader) {
    // Verify API Key
    const apiKeyRes = await db.query(
      'SELECT 1 FROM site_configs WHERE domain = $1 AND api_key = $2',
      [targetDomain, apiKeyHeader]
    );
    if (apiKeyRes.rowCount && apiKeyRes.rowCount > 0) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    return res.status(401).json({ error: 'Acceso no autorizado. Se requiere token JWT válido o cabecera X-API-Key.' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM employee_trainings WHERE client_id = $1 ORDER BY id DESC LIMIT 200',
      [targetDomain]
    );
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 19. Retrieve Training Materials for client (Public)
router.get('/training/materials/:client_id', openCors, async (req: any, res) => {
  const { client_id } = req.params;
  try {
    const db = getDb();
    const result = await db.query(
      'SELECT * FROM training_materials WHERE client_id = $1',
      [client_id]
    );
    
    if (result.rowCount && result.rowCount > 0) {
      return res.json(result.rows[0]);
    }

    // Default professional materials if not customized yet
    return res.json({
      client_id,
      presentation_url: '',
      policy_text: 'Directrices Corporativas de Privacidad y Protección de Datos:\n\n1. Respetar el principio de finalidad y proporcionalidad de los datos.\n2. Cifrar los datos sensibles de salud, biométricos o financieros.\n3. Recopilar datos solo tras consentimiento expreso del titular.\n4. No compartir bases de datos sin base legal clara.\n5. Canalizar solicitudes de usuarios al Canal ARCO+ oficial.'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 20. Update Training Materials (Protected by JWT)
router.put('/training/materials/:client_id', adminCors, authenticateToken, async (req: any, res) => {
  const { client_id } = req.params;
  const { presentation_url, policy_text } = req.body;

  if (!presentation_url || !policy_text) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios presentation_url o policy_text.' });
  }

  try {
    const db = getDb();
    
    // Verify tenant owns the requested domain
    const ownershipRes = await db.query(
      'SELECT 1 FROM site_configs WHERE domain = $1 AND user_id = $2',
      [client_id, req.user.id]
    );
    if (!ownershipRes.rowCount || ownershipRes.rowCount === 0) {
      return res.status(403).json({ error: 'No está autorizado para modificar este dominio.' });
    }

    await db.query(`
      INSERT INTO training_materials (client_id, presentation_url, policy_text, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (client_id) DO UPDATE SET
        presentation_url = EXCLUDED.presentation_url,
        policy_text = EXCLUDED.policy_text,
        updated_at = CURRENT_TIMESTAMP
    `, [client_id, presentation_url, policy_text]);

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- DOCUMENT VERSIONING ENDPOINTS ---

// 21. List all active documents for the tenant
router.get('/documents', adminCors, authenticateToken, async (req: any, res) => {
  try {
    const db = getDb();
    const result = await db.query(
      'SELECT * FROM documents WHERE client_id = $1 AND is_active = TRUE ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 22. Get history (versions) for a specific document
router.get('/documents/:document_id/history', adminCors, authenticateToken, async (req: any, res) => {
  const { document_id } = req.params;
  try {
    const db = getDb();
    // Validate ownership
    const docRes = await db.query('SELECT 1 FROM documents WHERE id = $1 AND client_id = $2', [document_id, req.user.id]);
    if (docRes.rowCount === 0) {
      return res.status(403).json({ error: 'No autorizado o el documento no existe.' });
    }

    const result = await db.query(
      'SELECT id, document_id, version_number, change_summary, author_id, created_at FROM document_versions WHERE document_id = $1 ORDER BY version_number DESC',
      [document_id]
    );
    return res.json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 23. Get specific version content
router.get('/documents/:document_id/version/:version_number', adminCors, authenticateToken, async (req: any, res) => {
  const { document_id, version_number } = req.params;
  try {
    const db = getDb();
    // Validate ownership
    const docRes = await db.query('SELECT title, document_type FROM documents WHERE id = $1 AND client_id = $2', [document_id, req.user.id]);
    if (docRes.rowCount === 0) {
      return res.status(403).json({ error: 'No autorizado o el documento no existe.' });
    }

    const result = await db.query(
      'SELECT * FROM document_versions WHERE document_id = $1 AND version_number = $2',
      [document_id, parseInt(version_number)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Versión no encontrada.' });
    }

    return res.json({
      document: docRes.rows[0],
      version: result.rows[0]
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 24. Create or update a document (create new version)
router.post('/documents/update', adminCors, authenticateToken, async (req: any, res) => {
  // If document_id is not provided, it creates a new document.
  const { document_id, title, document_type, content, change_summary } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'El contenido del documento es obligatorio.' });
  }

  try {
    const db = getDb();
    let docId = document_id;
    let nextVersion = 1;

    if (docId) {
      // Validate ownership
      const docRes = await db.query('SELECT 1 FROM documents WHERE id = $1 AND client_id = $2', [docId, req.user.id]);
      if (docRes.rowCount === 0) {
        return res.status(403).json({ error: 'No autorizado o el documento no existe.' });
      }

      // Get latest version number
      const verRes = await db.query('SELECT MAX(version_number) as max_ver FROM document_versions WHERE document_id = $1', [docId]);
      if (verRes.rows[0]?.max_ver) {
        nextVersion = verRes.rows[0].max_ver + 1;
      }
    } else {
      if (!title || !document_type) {
        return res.status(400).json({ error: 'Falta título o tipo de documento para crearlo.' });
      }
      // Create document
      const insertDocRes = await db.query(`
        INSERT INTO documents (client_id, title, document_type)
        VALUES ($1, $2, $3) RETURNING id
      `, [req.user.id, title, document_type]);
      docId = insertDocRes.rows[0].id;
    }

    // Insert new version
    const insertVerRes = await db.query(`
      INSERT INTO document_versions (document_id, version_number, content, change_summary, author_id)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [docId, nextVersion, content, change_summary || 'Actualización de documento', req.user.id]);

    return res.json({ success: true, document_id: docId, version: insertVerRes.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
