import { Router } from 'express';
import cors from 'cors';
import { getDb } from '../database/db.js';
import { runAudit } from '../services/crawlerService.js';
import { analyzeScanResults } from '../services/ropaDraftService.js';
import { authenticateToken } from '../middlewares/auth.js';
import { sendLeadAlert } from '../services/emailService.js';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const router = Router();

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

// 8. Update Site Config (written by Admin Dashboard)
router.put('/config/:domain', adminCors, authenticateToken, async (req: any, res) => {
  const { domain } = req.params;
  const { company_name, policy_version, policy_content, banner_title, banner_description } = req.body;

  if (!company_name || !policy_version || !policy_content || !banner_title || !banner_description) {
    return res.status(400).json({ error: 'Faltan parámetros de configuración obligatorios' });
  }

  try {
    const db = getDb();
    await db.query(`
      INSERT INTO site_configs (domain, company_name, policy_version, policy_content, banner_title, banner_description, updated_at, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
      ON CONFLICT (domain) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        policy_version = EXCLUDED.policy_version,
        policy_content = EXCLUDED.policy_content,
        banner_title = EXCLUDED.banner_title,
        banner_description = EXCLUDED.banner_description,
        updated_at = CURRENT_TIMESTAMP,
        user_id = EXCLUDED.user_id
    `, [
      domain,
      company_name,
      policy_version,
      JSON.stringify(policy_content),
      banner_title,
      banner_description,
      req.user.id
    ]);

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
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

export default router;
