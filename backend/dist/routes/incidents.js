import { Router } from 'express';
import cors from 'cors';
import { getDb } from '../database/db.js';
import { runSecurityScan } from '../services/securityScanner.js';
import { authenticateToken } from '../middlewares/auth.js';
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
router.options('*', cors());
// Protect all endpoints in this router
router.use(authenticateToken);
// GET /api/incidents - List all incidents for the authenticated user
router.get('/', adminCors, async (req, res) => {
    const db = getDb();
    try {
        const result = await db.query(`SELECT * FROM security_incidents 
       WHERE user_id = $1 
       ORDER BY incident_date DESC`, [req.user.id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching security incidents:', error.message);
        res.status(500).json({ error: 'Error al consultar la bitácora de incidentes.' });
    }
});
// POST /api/incidents - Register a new security breach
router.post('/', adminCors, async (req, res) => {
    const { domain, incident_title, incident_date, incident_type, affected_data_categories, approx_affected_titulars, description_and_effects, mitigation_measures, status } = req.body;
    if (!domain || !incident_title || !incident_date || !incident_type || !Array.isArray(affected_data_categories)) {
        return res.status(400).json({ error: 'Campos obligatorios faltantes o inválidos.' });
    }
    // 1. Calculate requires_agency_notification
    const requires_agency_notification = ['DATA_LEAK', 'RANSOMWARE_HACK', 'UNAUTHORIZED_ACCESS', 'LOST_DEVICE'].includes(incident_type) || approx_affected_titulars > 0;
    // 2. Calculate requires_titulars_notification
    const requires_titulars_notification = affected_data_categories.some((cat) => {
        const norm = cat.toLowerCase();
        return norm.includes('sensible') ||
            norm.includes('financiero') ||
            norm.includes('tarjeta') ||
            norm.includes('menor') ||
            norm.includes('sensitive') ||
            norm.includes('financial') ||
            norm.includes('minors');
    });
    const db = getDb();
    try {
        const result = await db.query(`INSERT INTO security_incidents 
       (domain, incident_title, incident_date, incident_type, affected_data_categories, 
        approx_affected_titulars, description_and_effects, mitigation_measures, 
        requires_agency_notification, requires_titulars_notification, status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`, [
            domain,
            incident_title,
            incident_date,
            incident_type,
            JSON.stringify(affected_data_categories),
            approx_affected_titulars || 0,
            description_and_effects || '',
            mitigation_measures || '',
            requires_agency_notification,
            requires_titulars_notification,
            status || 'DETECTED',
            req.user.id
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating security incident:', error.message);
        res.status(500).json({ error: 'Error al registrar la brecha de seguridad.' });
    }
});
// PUT /api/incidents/:id - Update mitigation, status and notifications
router.put('/:id', adminCors, async (req, res) => {
    const { id } = req.params;
    const { status, mitigation_measures, agency_notified_at, titulars_notified_at } = req.body;
    const db = getDb();
    try {
        const check = await db.query('SELECT 1 FROM security_incidents WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (check.rowCount === 0) {
            return res.status(404).json({ error: 'Registro de incidente no encontrado o sin permisos.' });
        }
        const result = await db.query(`UPDATE security_incidents
       SET status = COALESCE($2, status),
           mitigation_measures = COALESCE($3, mitigation_measures),
           agency_notified_at = COALESCE($4, agency_notified_at),
           titulars_notified_at = COALESCE($5, titulars_notified_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $6
       RETURNING *`, [
            id,
            status,
            mitigation_measures,
            agency_notified_at,
            titulars_notified_at,
            req.user.id
        ]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating security incident:', error.message);
        res.status(500).json({ error: 'Error al actualizar el incidente de seguridad.' });
    }
});
// POST /api/incidents/:id/generate-notice - Generate agency report and user notification email
router.post('/:id/generate-notice', adminCors, async (req, res) => {
    const { id } = req.params;
    const db = getDb();
    try {
        const check = await db.query('SELECT * FROM security_incidents WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (check.rowCount === 0) {
            return res.status(404).json({ error: 'Incidente no encontrado o sin permisos.' });
        }
        const incident = check.rows[0];
        const categories = Array.isArray(incident.affected_data_categories)
            ? incident.affected_data_categories
            : JSON.parse(incident.affected_data_categories);
        // 1. Generate Agency Notice
        const agencyNotice = `# OFICIO DE NOTIFICACIÓN DE BRECHA DE SEGURIDAD (LEY N° 21.719)
**A: Agencia de Protección de Datos Personales de Chile**
**REF: Reporte de Incidente de Seguridad de la Información (Art. 14 sexies / 34 quáter)**

Con fecha **${new Date(incident.incident_date).toLocaleDateString('es-CL')}**, la entidad responsable que opera el dominio **${incident.domain}** ha detectado una vulneración técnica en sus sistemas de información. A continuación se detallan los antecedentes del caso para los fines que estime procedentes la autoridad.

---

### I. DETALLES DE LA ENTIDAD RESPONSABLE
* **Dominio Corporativo:** ${incident.domain}
* **Fecha de Detección:** ${new Date(incident.incident_date).toLocaleString('es-CL')}
* **Estado Actual de Gestión:** ${incident.status}

### II. NATURALEZA DEL INCIDENTE Y EFECTOS
* **Tipo de Vulneración:** ${incident.incident_type}
* **Riesgos Identificados:** Filtración e infracción a los principios de confidencialidad y seguridad.
* **Descripción de los Hechos:**
  > ${incident.description_and_effects || 'No provisto.'}

### III. IMPACTO EN LOS TITULARES DE DATOS
* **Número Estimado de Personas Afectadas:** ${incident.approx_affected_titulars} titulares.
* **Categorías de Datos Comprometidos:**
${categories.map((c) => `  * - ${c}`).join('\n')}

### IV. MEDIDAS ADOPTADAS Y MITIGACIÓN
Las siguientes medidas han sido instruidas de inmediato para mitigar los efectos y evitar la reiteración de incidentes de esta naturaleza:
> ${incident.mitigation_measures || 'Bajo análisis inicial.'}

---
*Documento redactado en Santiago de Chile. Bitácora de Auditoría DPO Interna.*`;
        // 2. Generate Titulars Notice
        const titularsNotice = `## COMUNICADO IMPORTANTE: ACTUALIZACIÓN DE SEGURIDAD
**Estimado/a Cliente de ${incident.domain},**

Queremos informarte con total transparencia sobre un incidente técnico que afectó recientemente a uno de nuestros sistemas de almacenamiento de información, y detallar las medidas rápidas que hemos tomado para protegerte de acuerdo con la Ley N° 21.719.

---

### ¿Qué sucedió?
El día **${new Date(incident.incident_date).toLocaleDateString('es-CL')}**, detectamos un acceso no autorizado que comprometió un conjunto de nuestros registros informáticos.

### ¿Qué datos podrían estar involucrados?
Nuestros análisis preliminares indican que el incidente pudo haber expuesto los siguientes datos asociados a tu cuenta:
${categories.map((c) => `* **${c}**`).join('\n')}

### ¿Qué medidas adoptamos de inmediato?
1. **Contención:** Bloqueamos de forma definitiva la vulnerabilidad y aislamos los servidores afectados en menos de 24 horas.
2. **Auditoría:** Iniciamos una investigación forense junto a expertos externos en ciberseguridad.
3. **Autoridad:** Reportamos este incidente a la Agencia de Protección de Datos Personales para colaborar activamente.

### ¿Qué acciones te recomendamos realizar?
* **Cambio de Contraseña:** Te sugerimos cambiar tu contraseña de acceso en nuestro portal y en otros servicios donde utilices la misma clave.
* **Revisión de Movimientos:** Si tus datos de contacto o financieros se vieron involucrados, mantente atento a comunicaciones extrañas o cargos no autorizados.

Para cualquier duda, puedes contactar a nuestro Delegado de Protección de Datos (DPO) respondiendo a este correo.

Atentamente,
**Equipo de Privacidad y Ciberseguridad**
*${incident.domain}*`;
        res.json({
            agencyNotice,
            titularsNotice
        });
    }
    catch (error) {
        console.error('Error generating notices:', error.message);
        res.status(500).json({ error: 'Error al redactar los comunicados de brecha.' });
    }
});
// POST /api/incidents/scan-vulnerabilities - Proactive vulnerability scanning
router.post('/scan-vulnerabilities', adminCors, async (req, res) => {
    const { domain } = req.body;
    if (!domain) {
        return res.status(400).json({ error: 'Falta parámetro domain' });
    }
    const db = getDb();
    try {
        const scanResult = await runSecurityScan(domain, false);
        const incidentsCreated = [];
        // Filter Critical and High severity warnings to auto-escalate
        const targetVulnerabilities = scanResult.vulnerabilities.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH');
        for (const vul of targetVulnerabilities) {
            // 1. Prevent duplicate active alert incidents for this user
            const dupCheck = await db.query(`SELECT id FROM security_incidents 
         WHERE domain = $1 AND incident_title = $2 AND status != 'REPORTED_AND_CLOSED' AND user_id = $3`, [domain, `[ALERTA PREVENTIVA] ${vul.title}`, req.user.id]);
            if (dupCheck.rowCount === 0) {
                // 2. Insert alert as a preventive incident in database
                const insertRes = await db.query(`INSERT INTO security_incidents 
           (domain, incident_title, incident_date, incident_type, affected_data_categories, 
            approx_affected_titulars, description_and_effects, mitigation_measures, 
            requires_agency_notification, requires_titulars_notification, status, user_id)
           VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`, [
                    domain,
                    `[ALERTA PREVENTIVA] ${vul.title}`,
                    'PREVENTIVE_ALERT',
                    JSON.stringify(['Datos Generales']),
                    0,
                    vul.description,
                    vul.recommendation,
                    false,
                    false,
                    'DETECTED',
                    req.user.id
                ]);
                incidentsCreated.push(insertRes.rows[0]);
            }
        }
        res.json({
            scanResult,
            incidentsCreated
        });
    }
    catch (error) {
        console.error('Error running security scan:', error.message);
        res.status(422).json({ error: error.message });
    }
});
// POST /api/incidents/assess-risk - Sandbox Legal Risk Assessor
router.post('/assess-risk', adminCors, async (req, res) => {
    const { incident_type, affected_data_categories, approx_affected_titulars } = req.body;
    const requiresAgencyNotification = ['DATA_LEAK', 'RANSOMWARE_HACK', 'UNAUTHORIZED_ACCESS', 'LOST_DEVICE'].includes(incident_type) ||
        (approx_affected_titulars && Number(approx_affected_titulars) > 0);
    const sensitiveKeywords = ['bancarios', 'financiera', 'financieros', 'sensibles', 'sensible', 'menores', '14 años'];
    const categoriesStr = Array.isArray(affected_data_categories)
        ? affected_data_categories.join(' ').toLowerCase()
        : String(affected_data_categories || '').toLowerCase();
    const requiresTitularsNotification = sensitiveKeywords.some(keyword => categoriesStr.includes(keyword));
    let fineRange = 'Sin multa directa (Preventivo)';
    if (requiresAgencyNotification && requiresTitularsNotification) {
        fineRange = 'Multa Gravísima: Hasta 20.000 UTA (Art. 34)';
    }
    else if (requiresAgencyNotification) {
        fineRange = 'Multa Grave: Hasta 10.000 UTA (Art. 34)';
    }
    else if (incident_type !== 'PREVENTIVE_ALERT') {
        fineRange = 'Multa Leve: Amonestación o hasta 5.000 UTA';
    }
    res.json({
        requires_agency_notification: requiresAgencyNotification,
        requires_titulars_notification: requiresTitularsNotification,
        legal_fine_range: fineRange,
        assessment_date: new Date().toISOString()
    });
});
export default router;
