import { Router } from 'express';
import { getDb } from '../database/db.js';
import { evaluateQuestionnaire } from '../services/diagnosisEngine.js';
import { analyzeQuestionnaireAnswers } from '../services/ropaDraftService.js';
import { authenticateToken } from '../middlewares/auth.js';
import { sendTenantActivationAlert } from '../services/emailService.js';
import { resolveActiveOrganization, requireOrganizationPermission } from '../tenancy/organizationContext.js';

const router = Router();

// Protect all routes
router.use(authenticateToken);
router.use(resolveActiveOrganization);

// GET /api/reports/diagnosis - Unified Compliance Center Report
router.get('/diagnosis', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  let domain = req.query.domain as string;
  if (!domain) {
    const referer = req.headers.referer;
    if (referer) {
      try {
        const urlObj = new URL(referer);
        domain = urlObj.hostname;
      } catch (e) {
        // Safe to ignore
      }
    }
    if (!domain) {
      domain = req.headers.host || 'localhost:3000';
    }
  }

  const db = getDb();
  try {
    // 1a. Fetch latest actual web scan (where pages_analyzed is not empty)
    const scanRes = await db.query(
      `SELECT * FROM audit_reports 
       WHERE organization_id = $1 AND pages_analyzed IS NOT NULL AND pages_analyzed::text != '[]'
       ORDER BY created_at DESC LIMIT 1`,
      [req.organization.id]
    );
    
    let crawlScore = 100;
    let scanFindings: any[] = [];
    let scanActionPlan: any[] = [];
    let pagesAnalyzed: string[] = [];
    
    if (scanRes.rowCount && scanRes.rows[0]) {
      const row = scanRes.rows[0];
      crawlScore = row.score;
      scanFindings = row.findings || [];
      scanActionPlan = row.action_plan || [];
      pagesAnalyzed = row.pages_analyzed || [];

      // Override domain with actual scanned host if domain is the dashboard host or unresolved
      if (!req.query.domain || domain.includes('onrender.com') || domain.includes('localhost')) {
        try {
          const parsed = new URL(row.url.startsWith('http') ? row.url : 'http://' + row.url);
          domain = parsed.hostname;
        } catch {
          domain = row.url;
        }
      }
    }

    // 1b. Fetch latest questionnaire evaluation report (where pages_analyzed is empty)
    const evalRes = await db.query(
      `SELECT * FROM audit_reports 
       WHERE organization_id = $1 AND (pages_analyzed IS NULL OR pages_analyzed::text = '[]')
       ORDER BY created_at DESC LIMIT 1`,
      [req.organization.id]
    );
    
    let evalFindings: any[] = [];
    let evalActionPlan: any[] = [];
    
    if (evalRes.rowCount && evalRes.rows[0]) {
      const row = evalRes.rows[0];
      evalFindings = row.findings || [];
      evalActionPlan = row.action_plan || [];
    }

    // Merge findings and action plans
    const mergedFindingsMap = new Map<string, any>();
    scanFindings.forEach((f: any) => mergedFindingsMap.set(f.id, f));
    evalFindings.forEach((f: any) => mergedFindingsMap.set(f.id, f));
    const findings = Array.from(mergedFindingsMap.values());

    const mergedActionsMap = new Map<string, any>();
    scanActionPlan.forEach((a: any) => {
      const key = a.title || a.description || JSON.stringify(a);
      mergedActionsMap.set(key, a);
    });
    evalActionPlan.forEach((a: any) => {
      const key = a.title || a.description || JSON.stringify(a);
      mergedActionsMap.set(key, a);
    });
    const actionPlan = Array.from(mergedActionsMap.values());

    // 2. Get registered international transfers
    const transfersRes = await db.query(
      `SELECT * FROM international_transfers WHERE organization_id = $1`,
      [req.organization.id]
    );

    // 3. Get security incidents
    const incidentsRes = await db.query(
      `SELECT * FROM security_incidents WHERE organization_id = $1`,
      [req.organization.id]
    );



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

    // 5.5 Query ROPA confirmed and draft counts to apply exclusion / compliance gap check
    const ropaRes = await db.query(
      `SELECT 
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END)::int as confirmed_count,
        COUNT(CASE WHEN status = 'draft' THEN 1 END)::int as draft_count
       FROM ropa_inventory WHERE organization_id = $1`,
      [req.organization.id]
    );
    const confirmedRopaCount = ropaRes.rows[0]?.confirmed_count || 0;
    const draftRopaCount = ropaRes.rows[0]?.draft_count || 0;

    const ropaFindings: any[] = [];
    const ropaActions: any[] = [];
    let ropaForcedToZero = false;

    if (confirmedRopaCount === 0) {
      ropaForcedToZero = true;
      ropaFindings.push({
        id: 'FIND_ROPA_MISSING',
        category: 'Gobernanza',
        severity: 'Gravísima',
        description: 'Ausencia de Registro de Actividades (RoPA)',
        recommendation: 'Es imposible evaluar el cumplimiento sin confirmar primero el inventario de datos en la pestaña RoPA. Por favor, confirme o complete la información para generar su diagnóstico de riesgos.',
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
    } else if (draftRopaCount > 0) {
      ropaForcedToZero = true;
      ropaFindings.push({
        id: 'FIND_ROPA_DRAFTS_PENDING',
        category: 'Gobernanza',
        severity: 'Gravísima',
        description: 'Borradores de procesos detectados pendientes de revisión en el RoPA.',
        recommendation: 'Tiene procesos detectados pendientes de revisión en su Inventario. Confirme o rechace los borradores para generar un diagnóstico preciso.',
        details: 'Tiene procesos detectados pendientes de revisión en su Inventario. Confirme o rechace los borradores para generar un diagnóstico preciso.'
      });
      ropaActions.push({
        step: 0,
        title: 'Revisar borradores pendientes en RoPA',
        description: 'Revisar y confirmar o rechazar los borradores sugeridos en el Registro de Actividades de Tratamiento (RoPA).',
        priority: 'Alta',
        estimatedEffort: '15 minutos',
        details: 'Ingrese al módulo RoPA, analice los borradores sugeridos por el escáner y la IA, y confírmelos o rechácelos para poder evaluar el cumplimiento.'
      });
    }

    // 6. Calculate unified Global Compliance Score
    let globalScore = Math.round((crawlScore * 0.5) + (transfersScore * 0.3) + (securityScore * 0.2));
    if (ropaForcedToZero) {
      globalScore = 0;
    }

    // Combine findings and re-enumerate action steps
    const combinedFindings = [...findings, ...transferFindings, ...ropaFindings];
    const combinedActions = [...actionPlan, ...transferActions, ...ropaActions];
    
    // Sort combined actions by priority
    const priorityOrder: Record<string, number> = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
    combinedActions.sort((a: any, b: any) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
    combinedActions.forEach((item: any, index: number) => {
      item.step = index + 1;
    });

    // Fetch tenant subscription status for gating/paywall
    const userRes = await db.query(
      `SELECT subscription_plan, subscription_status FROM users WHERE id = $1`,
      [req.organization.id]
    );
    const plan = userRes.rows[0]?.subscription_plan || 'Pro';
    const status = userRes.rows[0]?.subscription_status || 'Active';
    const isPaid = plan.toLowerCase() !== 'free' && status.toLowerCase() === 'active';

    let gatedFindings = combinedFindings;
    let gatedActions = combinedActions;

    if (!isPaid) {
      gatedFindings = combinedFindings.map(f => ({
        ...f,
        recommendation: "Contenido exclusivo del Plan Pro",
        effort: 'HIGH',
        isGated: true
      }));

      gatedActions = combinedActions.map(a => ({
        ...a,
        description: "Contenido exclusivo del Plan Pro. Desbloquee su plan para ver las instrucciones operativas.",
        details: "Contenido exclusivo del Plan Pro.",
        isGated: true
      }));
    }

    res.json({
      domain,
      globalScore,
      breakdown: {
        crawlScore,
        transfersScore,
        securityScore
      },
      severityCounts: {
        leve: gatedFindings.filter(f => f.severity === 'Leve').length,
        grave: gatedFindings.filter(f => f.severity === 'Grave').length,
        gravisima: gatedFindings.filter(f => f.severity === 'Gravísima').length
      },
      findings: gatedFindings,
      actionPlan: gatedActions,
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
router.get('/questionnaire/latest', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
  const result = await getDb().query(
    `SELECT questionnaire_answers, created_at FROM audit_reports
      WHERE organization_id = $1 AND questionnaire_answers IS NOT NULL
      ORDER BY created_at DESC LIMIT 1`,
    [req.organization.id]
  );
  res.json(result.rows[0] || null);
});

router.post('/evaluate', requireOrganizationPermission('compliance.write'), async (req: any, res) => {
  try {
    const db = getDb();

    // Fetch count of confirmed and draft ROPA records
    const ropaRes = await db.query(
      `SELECT 
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END)::int as confirmed_count,
        COUNT(CASE WHEN status = 'draft' THEN 1 END)::int as draft_count
       FROM ropa_inventory WHERE organization_id = $1`,
      [req.organization.id]
    );
    const confirmed_ropa_count = ropaRes.rows[0]?.confirmed_count || 0;
    const draft_ropa_count = ropaRes.rows[0]?.draft_count || 0;

    const eligibilityRes = await db.query(
      `SELECT employee_count, operates_in_chile, industries, risk_factors
        FROM eligibility_assessments WHERE organization_id = $1
        ORDER BY created_at DESC LIMIT 1`,
      [req.organization.id]
    );
    const eligibility = eligibilityRes.rows[0] || {};
    const answers = {
      ...req.body,
      employee_count: eligibility.employee_count ?? null,
      operates_in_chile: eligibility.operates_in_chile ?? null,
      industries: eligibility.industries || [],
      eligibility_risk_factors: eligibility.risk_factors || {},
      confirmed_ropa_count,
      draft_ropa_count
    };
    const evaluation = evaluateQuestionnaire(answers);
    const domain = answers.domain || 'localhost:3000';
    
    const findingsToStore = evaluation.findings.filter(f => !f.id.startsWith('FIND_ROPA_'));

    const severityCounts = {
      leve: findingsToStore.filter(f => f.severity === 'Leve').length,
      grave: findingsToStore.filter(f => f.severity === 'Grave').length,
      gravisima: findingsToStore.filter(f => f.severity === 'Gravísima').length
    };

    const result = await db.query(
      `INSERT INTO audit_reports (url, score, severity_counts, findings, pages_analyzed, pages_skipped, action_plan, user_id, organization_id, questionnaire_answers)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        domain,
        evaluation.scoreTotal,
        JSON.stringify(severityCounts),
        JSON.stringify(findingsToStore),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify(evaluation.actionPlan || []),
        req.user.id,
        req.organization.id,
        JSON.stringify(answers)
      ]
    );

    // Asynchronously generate ROPA drafts from questionnaire answers (isolated try-catch for resilience)
    let ropaDraftsGenerated: any[] = [];
    try {
        await analyzeQuestionnaireAnswers(req.user.id, answers);
        const draftsRes = await db.query(
          "SELECT * FROM ropa_inventory WHERE organization_id = $1 AND status = 'draft' ORDER BY created_at DESC",
          [req.organization.id]
        );
        ropaDraftsGenerated = draftsRes.rows;
    } catch (err) {
        console.error('[Resilience] Error in RoPA inference. Proceeding with diagnosis.', err);
        // Fallamos de forma silenciosa para el RoPA, pero salvamos el Diagnóstico principal.
    }

    // Check if this is the first successful evaluation (confirmed ROPA > 0, and no previous successful audit_reports)
    try {
      const prevReports = await db.query(
        `SELECT COUNT(*)::int as count FROM audit_reports WHERE organization_id = $1 AND score > 0`,
        [req.organization.id]
      );
      const hasPreviousSuccess = (prevReports.rows[0]?.count || 0) > 0;

      if (confirmed_ropa_count > 0 && !hasPreviousSuccess) {
        sendTenantActivationAlert(req.user.id, req.user.company_name, evaluation.scoreTotal).catch((err: any) => {
          console.error('Error sending tenant activation alert email:', err.message);
        });
      }
    } catch (emailErr: any) {
      console.error('Error checking first ROPA activation:', emailErr.message);
    }

     res.json({
       id: result.rows[0]?.id || 1,
       domain,
       ropaDraftsGenerated,
       ...evaluation
     });
  } catch (error: any) {
    console.error('Error evaluating questionnaire:', error.message);
    res.status(550).json({ error: 'Error al evaluar y guardar el cuestionario: ' + error.message });
  }
});

// GET /api/reports/dossier - Aggregated Compliance Dossier for Fiscalization
router.get('/dossier', requireOrganizationPermission('compliance.read'), async (req: any, res) => {
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
      'SELECT score, severity_counts, findings, action_plan, created_at FROM audit_reports WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.organization.id]
    );
    const latestReport = reportRes.rows[0] || { score: 100, severity_counts: { leve: 0, grave: 0, gravisima: 0 }, findings: [], action_plan: [] };

    // 3. Get latest privacy policy timestamp
    const policyRes = await db.query(
      'SELECT updated_at FROM privacy_policies WHERE organization_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [req.organization.id]
    );
    const latestPolicy = policyRes.rows[0] || null;

    // 4. Count international transfers and SCC status
    const transfersRes = await db.query(
      'SELECT * FROM international_transfers WHERE organization_id = $1',
      [req.organization.id]
    );
    const totalTransfers = transfersRes.rowCount;
    const transfersWithScc = transfersRes.rows.filter((t: any) => t.has_scc).length;

    // 4.5 Get confirmed RoPA processes
    const ropaRes = await db.query(
      "SELECT * FROM ropa_inventory WHERE organization_id = $1 AND status = 'confirmed'",
      [req.organization.id]
    );
    const confirmedRopaCount = ropaRes.rowCount;
    const ropaProcesses = ropaRes.rows;

    // 5. Count risk matrix entries
    const risksRes = await db.query(
      'SELECT * FROM risk_matrix WHERE organization_id = $1',
      [req.organization.id]
    );
    const totalRisks = risksRes.rowCount;
    const mitigatedRisks = risksRes.rows.filter((r: any) => r.status === 'IMPLEMENTED' && r.review_status === 'CONFIRMED').length;
    const candidateRisks = risksRes.rows.filter((r: any) => r.review_status === 'PENDING_REVIEW').length;

    // Filter action plan items by priority (High and Medium, corresponding to Grave and Gravísima)
    const rawActionPlan = latestReport.action_plan || [];
    const prioritizedActions = rawActionPlan.filter(
      (a: any) => a.priority === 'Alta' || a.priority === 'Media'
    );

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
        mitigated: mitigatedRisks,
        pending_review: candidateRisks,
        note: 'Los candidatos pendientes de revisión no constituyen conclusiones jurídicas.'
      },
      ropa: {
        confirmed_count: confirmedRopaCount
      },
      ropa_processes: ropaProcesses,
      action_plan: prioritizedActions
    });
  } catch (error: any) {
    console.error('Error compiling audit dossier:', error.message);
    res.status(500).json({ error: 'Error al compilar el dossier oficial de cumplimiento: ' + error.message });
  }
});

export default router;
