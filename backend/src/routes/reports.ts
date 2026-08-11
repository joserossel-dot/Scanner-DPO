import { Router } from 'express';
import cors from 'cors';
import { getDb } from '../database/db.js';

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

// GET /api/reports/diagnosis - Unified Compliance Center Report
router.get('/diagnosis', adminCors, async (req, res) => {
  const { domain } = req.query;
  if (!domain) {
    return res.status(400).json({ error: 'Falta parámetro domain' });
  }

  const db = getDb();
  try {
    // 1. Get latest audit report from scanner
    const scanRes = await db.query(
      `SELECT * FROM audit_reports WHERE domain = $1 ORDER BY created_at DESC LIMIT 1`,
      [domain]
    );

    // 2. Get registered international transfers
    const transfersRes = await db.query(
      `SELECT * FROM international_transfers WHERE domain = $1`,
      [domain]
    );

    // 3. Get security incidents
    const incidentsRes = await db.query(
      `SELECT * FROM security_incidents WHERE domain = $1`,
      [domain]
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
    const activeIncidents = incidentsRes.rows.filter(i => i.status !== 'REPORTED_AND_CLOSED');
    activeIncidents.forEach((i: any) => {
      if (i.incident_type === 'PREVENTIVE_ALERT') {
        securityScore -= 5;
      } else {
        securityScore -= 20;
      }
    });
    securityScore = Math.max(0, securityScore);

    // 6. Calculate unified Global Compliance Score
    const globalScore = Math.round((crawlScore * 0.5) + (transfersScore * 0.3) + (securityScore * 0.2));

    // Combine findings and re-enumerate action steps
    const combinedFindings = [...findings, ...transferFindings];
    const combinedActions = [...actionPlan, ...transferActions];
    
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

export default router;
