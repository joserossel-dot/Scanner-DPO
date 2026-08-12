import { Router } from 'express';
import cors from 'cors';
import { getDb } from '../database/db.js';
import { evaluateQuestionnaire } from '../services/diagnosisEngine.js';
import { analyzeQuestionnaireAnswers } from '../services/ropaDraftService.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// CORS setup matching dashboard origins
const adminCors = cors((req: any, callback: any) => {
  const origin = req.header('Origin');
  const host = req.header('Host');
  const allowedOrigins = [
    process.env.DASHBOARD_ORIGIN,
    'http://localhost:5173',
    'http://localhost:3000',
    host
  ].filter(Boolean);

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

// Protect all routes
router.use(authenticateToken);

// GET /api/reports/diagnosis - Unified Compliance Center Report
router.get('/diagnosis', adminCors, async (req: any, res) => {
  const { domain } = req.query;
  if (!domain) {
    return res.status(400).json({ error: 'Falta parámetro domain' });
  }

  const db = getDb();
  try {
    // 1. Get latest audit report from scanner
    const scanRes = await db.query(
      `SELECT * FROM audit_reports WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    // 2. Get registered international transfers
    const transfersRes = await db.query(
      `SELECT * FROM international_transfers WHERE user_id = $1`,
      [req.user.id]
    );

    // 3. Get security incidents
    const incidentsRes = await db.query(
      `SELECT * FROM security_incidents WHERE user_id = $1`,
      [req.user.id]
    );

    let crawlScore = 100;
    let severityCounts = { leve: 0, grave: 0, gravisima: 0 };
    let findings: any[] = [];
    let actionPlan: any[] = [];
    let pagesAnalyzed: string[] = [];

    if (scanRes.rowCount && scanRes.rows[0]) {
      const row = scanRes.rows[0];
      crawlScore = row.score;
      severityCounts = row.severity_counts || { leve: 0, grave: 0, gravisima: 0 };
      findings = row.findings || [];
      actionPlan = row.action_plan || [];
      pagesAnalyzed = row.pages_analyzed || [];
    }

    // 4. Calculate international transfers risk impact
    let transfersScore = 100;
    const transferFindings: any[] = [];
    const transferActions: any[] = [];

    transfersRes.rows.forEach((t: any) => {
      const isUnregulated = !t.has_scc && !t.has_dpa;
      if (isUnregulated) {
        transfersScore -= 15;
        transferFindings.push({
          id: `unregulated_transfer_${t.id}`,
          category: 'international_transfers',
          severity: 'Grave',
          description: `Transferencia internacional de datos activa a proveedor extranjero (${t.provider_name}) sin Cláusulas Contractuales Tipo (SCC).`,
          recommendation: `Firmar Cláusulas Contractuales Tipo (SCC) y Acuerdo de Procesamiento de Datos (DPA) con el proveedor en ${t.country}.`,
          details: `El Art. 28 exige garantías para transferir datos a países no considerados adecuados por la resolución de la Agencia.`
        });
        transferActions.push({
          step: 0, // re-enumerated later
          title: `Regularizar proveedor extranjero: ${t.provider_name}`,
          description: `Falta firma de garantías contractuales obligatorias para transferencias internacionales (Art. 28).`,
          priority: 'Alta',
          estimatedEffort: '2 horas',
          details: `Utilizar el generador de Cláusulas Contractuales Tipo (SCC) en la pestaña de herramientas para exportar, firmar e indexar el documento con el proveedor.`
        });
      }
    });
    transfersScore = Math.max(0, transfersScore);

    // 5. Calculate security incidents threat impact
    let securityScore = 100;
    const activeIncidents = incidentsRes.rows.filter((i: any) => i.status !== 'REPORTED_AND_CLOSED');
    activeIncidents.forEach((i: any) => {
      if (i.incident_type === 'PREVENTIVE_ALERT') {
        securityScore -= 5;
      } else {
        securityScore -= 20;
      }
    });
    securityScore = Math.max(0, securityScore);

    // 5.5 Query ROPA confirmed count to apply exclusion / compliance gap check
    const ropaRes = await db.query(
      "SELECT COUNT(*)::int as count FROM ropa_inventory WHERE user_id = $1 AND status = 'confirmed'",
      [req.user.id]
    );
    const confirmedRopaCount = ropaRes.rows[0]?.count || 0;

    let crawlScoreAdjusted = crawlScore;
    const ropaFindings: any[] = [];
    const ropaActions: any[] = [];

    if (confirmedRopaCount === 0) {
      crawlScoreAdjusted = Math.max(0, crawlScore - 15);
      ropaFindings.push({
        id: 'FIND_ROPA_MISSING',
        category: 'Gobernanza',
        severity: 'Grave',
        description: 'Infracción Grave (Art. 12) - Inexistencia de un Registro de Actividades de Tratamiento (RoPA) confirmado y formalizado.',
        recommendation: 'Completar y confirmar el inventario de actividades en la pestaña RoPA para mapear el ciclo de vida de los datos personales.',
        details: 'El Registro de Actividades de Tratamiento es obligatorio para demostrar cumplimiento ante fiscalizaciones del regulador.'
      });
      ropaActions.push({
        step: 0, // re-enumerated later
        title: 'Formalizar y confirmar el inventario RoPA',
        description: 'Mapear e inventariar las actividades de tratamiento de datos personales de la empresa (Art. 12).',
        priority: 'Alta',
        estimatedEffort: '3 horas',
        details: 'Ingresar al módulo RoPA, revisar las sugerencias automáticas generadas y confirmar los borradores correspondientes.'
      });
    }

    // 6. Calculate unified Global Compliance Score
    const globalScore = Math.round((crawlScoreAdjusted * 0.5) + (transfersScore * 0.3) + (securityScore * 0.2));

    // Combine findings and re-enumerate action steps
    const combinedFindings = [...findings, ...transferFindings, ...ropaFindings];
    const combinedActions = [...actionPlan, ...transferActions, ...ropaActions];
    
    // Sort combined actions by priority
    const priorityOrder: Record<string, number> = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
    combinedActions.sort((a: any, b: any) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
    combinedActions.forEach((item: any, index: number) => {
      item.step = index + 1;
    });

    res.json({
      domain,
      globalScore,
      breakdown: {
        crawlScore,
        transfersScore,
        securityScore
      },
      severityCounts: {
        leve: combinedFindings.filter(f => f.severity === 'Leve').length,
        grave: combinedFindings.filter(f => f.severity === 'Grave').length,
        gravisima: combinedFindings.filter(f => f.severity === 'Gravísima').length
      },
      findings: combinedFindings,
      actionPlan: combinedActions,
      pagesAnalyzed,
      totalTransfers: transfersRes.rowCount,
      totalIncidents: incidentsRes.rowCount,
      activeIncidents: activeIncidents.length
    });
  } catch (error: any) {
    console.error('Error compiling diagnosis report:', error.message);
    res.status(500).json({ error: 'Error al generar el reporte consolidad de cumplimiento.' });
  }
});

// POST /api/reports/evaluate - Evaluate diagnostic questionnaire and save report
router.post('/evaluate', adminCors, async (req: any, res) => {
  try {
    const db = getDb();

    // Fetch count of confirmed ROPA records
    const ropaRes = await db.query(
      "SELECT COUNT(*)::int as count FROM ropa_inventory WHERE user_id = $1 AND status = 'confirmed'",
      [req.user.id]
    );
    const confirmed_ropa_count = ropaRes.rows[0]?.count || 0;

    const answers = { ...req.body, confirmed_ropa_count };
    const evaluation = evaluateQuestionnaire(answers);
    const domain = answers.domain || 'localhost:3000';
    
    const severityCounts = {
      leve: evaluation.findings.filter(f => f.severity === 'Leve').length,
      grave: evaluation.findings.filter(f => f.severity === 'Grave').length,
      gravisima: evaluation.findings.filter(f => f.severity === 'Gravísima').length
    };

    const result = await db.query(
      `INSERT INTO audit_reports (url, score, severity_counts, findings, pages_analyzed, pages_skipped, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        domain,
        evaluation.scoreTotal,
        JSON.stringify(severityCounts),
        JSON.stringify(evaluation.findings),
        JSON.stringify([]),
        JSON.stringify([]),
        req.user.id
      ]
    );

    // Asynchronously generate ROPA drafts from questionnaire answers
    analyzeQuestionnaireAnswers(req.user.id, answers).catch((err: any) => {
      console.error('[RoPADraftService] Error in questionnaire inference:', err.message);
    });

    res.json({
      id: result.rows[0]?.id || 1,
      domain,
      ...evaluation
    });
  } catch (error: any) {
    console.error('Error evaluating questionnaire:', error.message);
    res.status(550).json({ error: 'Error al evaluar y guardar el cuestionario: ' + error.message });
  }
});

// GET /api/reports/dossier - Aggregated Compliance Dossier for Fiscalization
router.get('/dossier', adminCors, async (req: any, res) => {
  const db = getDb();
  try {
    // 1. Get user/company info
    const userRes = await db.query(
      'SELECT company_name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'Inquilino no encontrado.' });
    }
    const company = userRes.rows[0];

    // 2. Get latest score
    const reportRes = await db.query(
      'SELECT score, severity_counts, created_at FROM audit_reports WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    const latestReport = reportRes.rows[0] || { score: 100, severity_counts: { leve: 0, grave: 0, gravisima: 0 } };

    // 3. Get latest privacy policy timestamp
    const policyRes = await db.query(
      'SELECT updated_at FROM privacy_policies WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [req.user.id]
    );
    const latestPolicy = policyRes.rows[0] || null;

    // 4. Count international transfers and SCC status
    const transfersRes = await db.query(
      'SELECT * FROM international_transfers WHERE user_id = $1',
      [req.user.id]
    );
    const totalTransfers = transfersRes.rowCount;
    const transfersWithScc = transfersRes.rows.filter((t: any) => t.has_scc).length;

    // 4.5 Get confirmed RoPA count
    const ropaRes = await db.query(
      "SELECT COUNT(*)::int as count FROM ropa_inventory WHERE user_id = $1 AND status = 'confirmed'",
      [req.user.id]
    );
    const confirmedRopaCount = ropaRes.rows[0]?.count || 0;

    // 5. Count risk matrix entries
    const risksRes = await db.query(
      'SELECT * FROM risk_matrix WHERE user_id = $1',
      [req.user.id]
    );
    const totalRisks = risksRes.rowCount;
    const mitigatedRisks = risksRes.rows.filter((r: any) => r.status === 'IMPLEMENTED').length;

    res.json({
      company_name: company.company_name,
      company_email: company.email,
      created_at: company.created_at,
      latest_score: latestReport.score,
      severity_counts: latestReport.severity_counts,
      last_policy_updated: latestPolicy ? latestPolicy.updated_at : null,
      transfers: {
        total: totalTransfers,
        with_scc: transfersWithScc
      },
      risks: {
        total: totalRisks,
        mitigated: mitigatedRisks
      },
      ropa: {
        confirmed_count: confirmedRopaCount
      }
    });
  } catch (error: any) {
    console.error('Error compiling audit dossier:', error.message);
    res.status(500).json({ error: 'Error al compilar el dossier oficial de cumplimiento: ' + error.message });
  }
});

export default router;
