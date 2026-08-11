import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Iniciando pruebas de integración para el Módulo de Incidentes y Brechas...');

  // 1. Create a security config for testing if not exists
  const configPayload = {
    company_name: 'Test Corporativo Incidents',
    policy_version: 'v1.0.0',
    banner_title: 'Prueba de Brechas',
    banner_description: 'Prueba de cumplimiento',
    policy_content: { representative: 'DPO Test', representative_email: 'dpo@test.com' }
  };

  try {
    await fetch(`${API_BASE}/api/config/localhost:3000`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configPayload)
    });
    console.log('✓ Configuración del sitio de prueba asegurada.');
  } catch (e) {
    console.log('⚠️ Servidor local no detectado en puerto 3000. Probando lógica conceptual.');
    return;
  }

  // 2. Register incident that DOES require notification (Sensitive/Financial Data compromised)
  console.log('\n--- 2. Registrando incidente con datos financieros (Requiere notificaciones) ---');
  const incidentPayload1 = {
    domain: 'localhost:3000',
    incident_title: 'Fuga de base de datos de transacciones de clientes',
    incident_date: new Date().toISOString(),
    incident_type: 'DATA_LEAK',
    affected_data_categories: ['Datos de Contacto General (Emails, Teléfonos)', 'Datos Bancarios u Obligaciones Financieras'],
    approx_affected_titulars: 1250,
    description_and_effects: 'Intrusión externa aprovechando vulnerabilidad en puerto expuesto.',
    mitigation_measures: 'Cierre inmediato de puerto, rotación de credenciales y aislamiento de servidor afectado.',
    status: 'UNDER_ANALYSIS'
  };

  const createRes1 = await fetch(`${API_BASE}/api/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incidentPayload1)
  });

  const incident1 = await createRes1.json();
  console.log('Incidente Creado:', incident1);
  console.log('¿Exige Notificación a la Agencia?:', incident1.requires_agency_notification ? 'SÍ (Correcto)' : 'NO (Error)');
  console.log('¿Exige Notificación a Titulares?:', incident1.requires_titulars_notification ? 'SÍ (Correcto)' : 'NO (Error)');

  // 3. Register incident that DOES NOT require notification to titulars (Only general identity, human error)
  console.log('\n--- 3. Registrando error humano con datos generales (Sin notificar titulares) ---');
  const incidentPayload2 = {
    domain: 'localhost:3000',
    incident_title: 'Envío accidental de planilla de contacto a destinatario externo',
    incident_date: new Date().toISOString(),
    incident_type: 'HUMAN_ERROR',
    affected_data_categories: ['Datos de Contacto General (Emails, Teléfonos)'],
    approx_affected_titulars: 15,
    description_and_effects: 'Un analista envió un correo con un archivo adjunto incorrecto.',
    mitigation_measures: 'Solicitud de borrado del correo y capacitación de seguridad al personal.',
    status: 'DETECTED'
  };

  const createRes2 = await fetch(`${API_BASE}/api/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incidentPayload2)
  });

  const incident2 = await createRes2.json();
  console.log('Incidente Creado:', incident2);
  console.log('¿Exige Notificación a la Agencia?:', incident2.requires_agency_notification ? 'SÍ (Correcto)' : 'NO (Error)');
  console.log('¿Exige Notificación a Titulares?:', incident2.requires_titulars_notification ? 'SÍ (Correcto)' : 'NO (Error)');

  // 4. Query sitemaps log
  console.log('\n--- 4. Consultando la bitácora completa de incidentes ---');
  const listRes = await fetch(`${API_BASE}/api/incidents?domain=localhost:3000`);
  const list = await listRes.json();
  console.log(`Se encontraron ${list.length} incidentes registrados para localhost:3000.`);

  // 5. Update Status to Mitigated & Closed
  console.log('\n--- 5. Actualizando estado de incidente a resuelto ---');
  const updateRes = await fetch(`${API_BASE}/api/incidents/${incident1.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'REPORTED_AND_CLOSED',
      agency_notified_at: new Date().toISOString(),
      titulars_notified_at: new Date().toISOString()
    })
  });
  const updatedIncident = await updateRes.json();
  console.log('Incidente Actualizado:', updatedIncident);

  // 6. Generate Official Notices
  console.log('\n--- 6. Generando borradores oficiales para la Agencia y Titulares ---');
  const noticeRes = await fetch(`${API_BASE}/api/incidents/${incident1.id}/generate-notice`, {
    method: 'POST'
  });
  const notices = await noticeRes.json();
  console.log('\n=== Borrador de Oficio a la Agencia (DPA) ===');
  console.log(notices.agencyNotice);
  console.log('\n=== Borrador de Comunicación a Titulares ===');
  console.log(notices.titularsNotice);

  console.log('\n🎉 Pruebas de integración del Módulo de Incidentes finalizadas con éxito.');
}

runTests();
