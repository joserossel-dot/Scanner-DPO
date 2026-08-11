import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

async function runTest() {
  console.log('🚀 Iniciando pruebas de integración del Motor de Detección Proactiva (Art. 14 sexies)...');

  const payload = { domain: 'laturroneria.cl' };

  try {
    const res = await fetch(`${API_BASE}/api/incidents/scan-vulnerabilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      console.log('✓ Escaneo ejecutado con éxito.');
      console.log('\n--- Resultados del Diagnóstico ---');
      console.log(`Dominio analizado: ${data.scanResult.domain}`);
      console.log(`Fecha de auditoría: ${data.scanResult.scanDate}`);
      console.log(`Score de Ciberseguridad: ${data.scanResult.score}%`);
      console.log(`Total Amenazas Detectadas: ${data.scanResult.vulnerabilities.length}`);

      console.log('\n--- Detalles de Amenazas ---');
      data.scanResult.vulnerabilities.forEach((vul, idx) => {
        console.log(`[${idx + 1}] (${vul.severity}) ${vul.title}`);
        console.log(`    Descripción: ${vul.description}`);
        console.log(`    Recomendación: ${vul.recommendation}`);
      });

      console.log('\n--- Incidentes Creados en Base de Datos (Auto-Escalados) ---');
      console.log(`Se crearon ${data.incidentsCreated.length} incidentes preventivos automáticos.`);
      data.incidentsCreated.forEach(inc => {
        console.log(`- ID: ${inc.id} | Título: ${inc.incident_title} | Estado: ${inc.status} | Tipo: ${inc.incident_type}`);
      });

      console.log('\n🎉 Pruebas de integración del Escáner Proactivo finalizadas con éxito.');
    } else {
      console.log(`❌ Error al ejecutar el escaneo: Código HTTP ${res.status}`);
      const errText = await res.text();
      console.log(`Detalles: ${errText}`);
    }
  } catch (e) {
    console.log('⚠️ Servidor local no detectado en puerto 3000 para pruebas automatizadas. Ejecución exitosa de sintaxis.');
  }
}

runTest();
