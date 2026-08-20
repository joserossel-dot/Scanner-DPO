import { Router } from 'express';
import cors from 'cors';
import { generateContractText } from '../services/contractBuilder.js';
import { generatePrivacyPolicy } from '../services/policyBuilder.js';
import { authenticateToken } from '../middlewares/auth.js';
import { getDb } from '../database/db.js';
import { sendImplementationRequestAlert } from '../services/emailService.js';
const router = Router();
// CORS setup matching dashboard origins
const adminCors = cors((req, callback) => {
    const origin = req.header('Origin');
    const host = req.header('Host');
    const allowedOrigins = [
        process.env.DASHBOARD_ORIGIN,
        'http://localhost:5173',
        'http://localhost:3000',
        host
    ].filter(Boolean);
    const isAllowed = !origin || allowedOrigins.some(allowed => origin === allowed ||
        origin === `https://${allowed}` ||
        origin === `http://${allowed}`);
    let corsOptions;
    if (isAllowed || process.env.NODE_ENV !== 'production') {
        corsOptions = { origin: true, credentials: true };
    }
    else {
        corsOptions = { origin: false };
    }
    callback(null, corsOptions);
});
// Protect all routes
router.use(authenticateToken);
// GET /api/remediation/policies - Get the saved policy for active user
router.get('/policies', adminCors, async (req, res) => {
    const db = getDb();
    try {
        const result = await db.query('SELECT * FROM privacy_policies WHERE user_id = $1', [req.user.id]);
        if (result.rowCount === 0) {
            return res.json(null);
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching privacy policy:', error.message);
        res.status(500).json({ error: 'Error al consultar la política de privacidad.' });
    }
});
// POST /api/remediation/policies - Generate and save/update policy
router.post('/policies', adminCors, async (req, res) => {
    const { companyRut, address, contactEmail, dataCategories, purposes, retentionRules } = req.body;
    if (!companyRut || !address || !contactEmail || !Array.isArray(dataCategories) || !Array.isArray(purposes) || !retentionRules) {
        return res.status(400).json({ error: 'Campos del formulario incompletos o inválidos.' });
    }
    const db = getDb();
    try {
        // 1. Full confirmed RoPA processes (for granular purpose/retention table)
        const ropaRes = await db.query(`SELECT process_name, purpose, legal_basis, retention_period, cross_border_transfer
       FROM ropa_inventory 
       WHERE user_id = $1 AND status = 'confirmed'
       ORDER BY created_at ASC`, [req.user.id]);
        // 2. Registered international transfers (vendor names for encargados section)
        const transfersRes = await db.query(`SELECT DISTINCT vendor_name FROM international_transfers WHERE user_id = $1`, [req.user.id]);
        // 3. Build deduplicated provider/encargado list
        //    Sources: (a) auto-generated "Tratamiento de Datos en <vendor>" names,
        //             (b) well-known SaaS names appearing in process_name or purpose,
        //             (c) vendor_name from international_transfers table.
        const providersSet = new Set();
        // Map of well-known SaaS substrings → canonical display name
        const KNOWN_SAAS = {
            google: 'Google (Workspace / Analytics)',
            aws: 'Amazon Web Services (AWS)',
            amazon: 'Amazon Web Services (AWS)',
            microsoft: 'Microsoft (Azure / Office 365)',
            meta: 'Meta Platforms (Facebook / Instagram)',
            facebook: 'Meta Platforms (Facebook / Instagram)',
            hubspot: 'HubSpot',
            mailchimp: 'Mailchimp (Intuit)',
            salesforce: 'Salesforce',
            stripe: 'Stripe',
            slack: 'Slack (Salesforce)',
            zoom: 'Zoom Video Communications',
            sendgrid: 'SendGrid (Twilio)',
            intercom: 'Intercom',
            zendesk: 'Zendesk',
            buk: 'Buk (Chile)',
            talana: 'Talana (Chile)',
            defontana: 'Defontana (Chile)',
        };
        ropaRes.rows.forEach((r) => {
            const procName = (r.process_name || '').trim();
            const purpose = (r.purpose || '').toLowerCase();
            const lowerProc = procName.toLowerCase();
            // (a) Auto-generated prefix pattern
            if (procName.startsWith('Tratamiento de Datos en ')) {
                const vendorName = procName.replace('Tratamiento de Datos en ', '').trim();
                if (vendorName)
                    providersSet.add(vendorName);
                return; // already handled, skip keyword scan for this row
            }
            // (b) Keyword scan across process_name + purpose
            let matchedVendor = null;
            for (const [keyword, display] of Object.entries(KNOWN_SAAS)) {
                if (lowerProc.includes(keyword) || purpose.includes(keyword)) {
                    matchedVendor = display;
                    break;
                }
            }
            if (matchedVendor)
                providersSet.add(matchedVendor);
        });
        // (c) Registered transfers
        transfersRes.rows.forEach((t) => {
            const clean = (t.vendor_name || '').trim();
            if (clean)
                providersSet.add(clean);
        });
        const providersList = Array.from(providersSet);
        // 4. Shape RoPA objects for the policy builder
        const ropaProcesses = ropaRes.rows.map((r) => ({
            process_name: r.process_name,
            purpose: r.purpose,
            legal_basis: r.legal_basis,
            retention_period: r.retention_period,
            cross_border_transfer: r.cross_border_transfer === true
        }));
        const policyHtml = generatePrivacyPolicy({
            companyRut,
            address,
            contactEmail,
            dataCategories,
            purposes,
            retentionRules,
            providers: providersList,
            ropaProcesses,
            tenantId: String(req.user.id)
        });
        const result = await db.query(`INSERT INTO privacy_policies (user_id, company_rut, address, contact_email, data_categories, purposes, retention_rules, policy_html)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         company_rut = EXCLUDED.company_rut,
         address = EXCLUDED.address,
         contact_email = EXCLUDED.contact_email,
         data_categories = EXCLUDED.data_categories,
         purposes = EXCLUDED.purposes,
         retention_rules = EXCLUDED.retention_rules,
         policy_html = EXCLUDED.policy_html,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`, [
            req.user.id,
            companyRut,
            address,
            contactEmail,
            JSON.stringify(dataCategories),
            JSON.stringify(purposes),
            retentionRules,
            policyHtml
        ]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error saving privacy policy:', error.message);
        res.status(500).json({ error: 'Error al generar o guardar la política de privacidad.' });
    }
});
// POST /api/remediation/generate-contract
router.post('/generate-contract', adminCors, async (req, res) => {
    try {
        const data = req.body;
        if (!data.clientName || !data.clientRut || !data.vendorName || !data.contractType) {
            return res.status(400).json({ error: 'Faltan parámetros obligatorios en la petición.' });
        }
        const htmlContent = generateContractText(data);
        res.json({
            success: true,
            contractType: data.contractType,
            htmlContent
        });
    }
    catch (error) {
        console.error('Error generating contract document:', error.message);
        res.status(500).json({ error: 'Error interno al redactar el contrato: ' + error.message });
    }
});
// POST /api/remediation/log-download - Audit log download of documents (P1 - Punto 8)
router.post('/log-download', adminCors, async (req, res) => {
    const { document_type, content_hash, disclaimer_version } = req.body;
    if (!document_type || !content_hash || !disclaimer_version) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios en la petición.' });
    }
    const validTypes = ['privacy_policy', 'dpa', 'scc', 'terms'];
    if (!validTypes.includes(document_type)) {
        return res.status(400).json({ error: 'Tipo de documento legal inválido.' });
    }
    try {
        const db = getDb();
        const result = await db.query(`INSERT INTO document_downloads (user_id, document_type, content_hash, disclaimer_version)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [
            req.user.id,
            document_type,
            content_hash,
            disclaimer_version
        ]);
        res.json({
            success: true,
            download: result.rows[0]
        });
    }
    catch (error) {
        console.error('Error logging document download:', error.message);
        res.status(500).json({ error: 'Error al registrar la descarga en la bitácora legal: ' + error.message });
    }
});
// POST /api/remediation/request-help - Request implementation help for a finding (P0-A)
router.post('/request-help', adminCors, async (req, res) => {
    const { findingId, description, effort } = req.body;
    if (!findingId || !description || !effort) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: findingId, description, effort.' });
    }
    const db = getDb();
    const userId = req.user.id;
    try {
        // 1. Insert into database
        await db.query(`INSERT INTO implementation_requests (user_id, finding_id, finding_description, effort)
       VALUES ($1, $2, $3, $4)`, [userId, findingId, description, effort]);
        // 2. Fetch tenant email and company name to send alert
        const userRes = await db.query('SELECT email, company_name FROM users WHERE id = $1', [userId]);
        const userEmail = userRes.rows[0]?.email || 'unknown@tenant.cl';
        const companyName = userRes.rows[0]?.company_name || 'Inquilino';
        // 3. Dispatch alert email to internal team
        await sendImplementationRequestAlert(userId, userEmail, companyName, findingId, description, effort);
        return res.json({
            success: true,
            message: 'Solicitud enviada — nuestro equipo la revisará en las próximas 24-48 horas'
        });
    }
    catch (error) {
        console.error('Error in request-help remediation route:', error.message);
        return res.status(500).json({ error: 'Error interno al procesar la solicitud: ' + error.message });
    }
});
export default router;
