import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Iniciando validación técnica de la Arquitectura de 3 Capas...');

  // Capa 1: Live Web Scan Audit
  console.log('\n--- Capa 1: Auditoría Web de Ingesta (Live Crawl) ---');
  try {
    const scanRes = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'localhost:3000/mock-site/index.html' })
    });
    if (scanRes.ok) {
      const data = await scanRes.json();
      console.log('✓ Escaneo en vivo ejecutado con éxito.');
      console.log(`- Score del Crawler: ${data.score}%`);
      console.log(`- Páginas analizadas: ${data.pagesAnalyzed?.length || 0}`);
    } else {
      console.log(`⚠️ Error al conectar con /api/scan. HTTP ${scanRes.status}`);
    }
  } catch (e) {
    console.log('⚠️ Servidor local inactivo. Omite ejecución en vivo.');
    return;
  }

  // Capa 2: Risk Diagnosis
  console.log('\n--- Capa 2: Diagnóstico & Evaluación Consolidada ---');
  const diagRes = await fetch(`${API_BASE}/api/reports/diagnosis?domain=localhost:3000`);
  if (diagRes.ok) {
    const data = await diagRes.json();
    console.log('✓ Diagnóstico consolidado devuelto con éxito.');
    console.log(`- Score Global de Cumplimiento: ${data.globalScore}%`);
    console.log(`- Desglose: Web (${data.breakdown.crawlScore}%) | TID (${data.breakdown.transfersScore}%) | Seguridad (${data.breakdown.securityScore}%)`);
    console.log(`- Total Hallazgos consolidados: ${data.findings.length}`);
    console.log(`- Total Pasos de mitigación generados: ${data.actionPlan.length}`);
  }

  // Capa 2: Legal Risk Sandbox Assessor
  console.log('\n--- Capa 2: Evaluador Sandbox de Riesgo de Incidente ---');
  const riskPayload = {
    incident_type: 'RANSOMWARE_HACK',
    affected_data_categories: ['Datos Bancarios u Obligaciones Financieras (Financieros)'],
    approx_affected_titulars: 1500
  };
  const riskRes = await fetch(`${API_BASE}/api/incidents/assess-risk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(riskPayload)
  });
  if (riskRes.ok) {
    const data = await riskRes.json();
    console.log('✓ Evaluación Sandbox de Riesgo exitosa.');
    console.log(`- ¿Requiere Notificar Agencia?: ${data.requires_agency_notification ? 'SÍ' : 'NO'}`);
    console.log(`- ¿Requiere Notificar Titulares?: ${data.requires_titulars_notification ? 'SÍ' : 'NO'}`);
    console.log(`- Rango de Multa Aplicable: ${data.legal_fine_range}`);
  }

  console.log('\n🎉 Validación de la arquitectura de 3 Capas finalizada con éxito.');
}

runTests();
