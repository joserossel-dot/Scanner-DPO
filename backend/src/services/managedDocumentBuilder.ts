export type ManagedDocumentType =
  | 'EMPLOYEE_ANNEX'
  | 'RETENTION_POLICY'
  | 'ARCO_PROCEDURE'
  | 'INCIDENT_PLAYBOOK';

export interface ManagedDocumentContext {
  companyName: string;
  taxIdentifier?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  processes: Array<{
    process_name: string;
    data_categories: string[];
    retention_period: string;
    deletion_method?: string | null;
  }>;
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const shell = (title: string, body: string) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:Arial,sans-serif;color:#172033;line-height:1.55;padding:36px;max-width:900px;margin:auto}h1{font-size:22px}h2{font-size:16px;margin-top:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccd4e0;padding:8px;text-align:left;vertical-align:top}.notice{background:#fff7db;border:1px solid #e8c65d;padding:12px;margin:20px 0;font-size:12px}</style>
</head><body><h1>${escapeHtml(title)}</h1>${body}
<div class="notice"><strong>Borrador sujeto a revisión profesional.</strong> Debe validarse con información confirmada de la organización antes de aprobarse, firmarse o publicarse.</div>
</body></html>`;

function companyBlock(context: ManagedDocumentContext): string {
  return `<p><strong>Organización:</strong> ${escapeHtml(context.companyName)}<br>
  <strong>Identificación:</strong> ${escapeHtml(context.taxIdentifier || 'Pendiente de confirmar')}<br>
  <strong>Contacto de privacidad:</strong> ${escapeHtml(context.contactName || 'Pendiente de designar')} (${escapeHtml(context.contactEmail || 'pendiente')})</p>`;
}

export function documentTitle(type: ManagedDocumentType): string {
  return {
    EMPLOYEE_ANNEX: 'Anexo laboral de confidencialidad y protección de datos',
    RETENTION_POLICY: 'Política de retención, eliminación y anonimización',
    ARCO_PROCEDURE: 'Procedimiento para solicitudes de derechos ARCO+',
    INCIDENT_PLAYBOOK: 'Playbook de gestión de incidentes de datos personales'
  }[type];
}

export function buildManagedDocument(type: ManagedDocumentType, context: ManagedDocumentContext): string {
  const company = companyBlock(context);
  if (type === 'EMPLOYEE_ANNEX') {
    return shell(documentTitle(type), `${company}
      <h2>1. Objeto</h2><p>La persona trabajadora se obliga a tratar datos personales únicamente para las funciones autorizadas, siguiendo instrucciones documentadas y las políticas internas vigentes.</p>
      <h2>2. Confidencialidad y acceso</h2><p>Debe mantener confidencialidad durante y después de la relación laboral, utilizar credenciales individuales, impedir accesos no autorizados y comunicar inmediatamente pérdidas, errores o incidentes.</p>
      <h2>3. Uso, transferencia y eliminación</h2><p>No podrá copiar, transferir, divulgar ni conservar datos para fines personales. Al terminar sus funciones deberá devolver o eliminar la información y accesos conforme a instrucciones de la organización.</p>
      <h2>4. Derechos y controles</h2><p>La organización podrá verificar el cumplimiento de estas obligaciones respetando la normativa laboral y las políticas comunicadas.</p>
      <h2>Firmas</h2><p>Por la organización: ____________________ &nbsp;&nbsp; Persona trabajadora: ____________________</p>`);
  }
  if (type === 'RETENTION_POLICY') {
    const rows = context.processes.length
      ? context.processes.map(process => `<tr><td>${escapeHtml(process.process_name)}</td><td>${escapeHtml(process.data_categories.join(', '))}</td><td>${escapeHtml(process.retention_period)}</td><td>${escapeHtml(process.deletion_method || 'Pendiente de definir')}</td></tr>`).join('')
      : '<tr><td colspan="4">No existen tratamientos confirmados. Completar el RoPA antes de aprobar.</td></tr>';
    return shell(documentTitle(type), `${company}
      <h2>1. Principios operativos</h2><p>Los datos se conservarán solo durante el período aprobado para cada finalidad, considerando obligaciones legales, defensa de derechos y bloqueos aplicables.</p>
      <h2>2. Matriz de retención</h2><table><thead><tr><th>Actividad</th><th>Datos</th><th>Plazo o evento</th><th>Eliminación o anonimización</th></tr></thead><tbody>${rows}</tbody></table>
      <h2>3. Ejecución y evidencia</h2><p>El dueño del proceso y el responsable técnico deben ejecutar la acción, registrar fecha, sistemas alcanzados, excepciones y evidencia verificable.</p>`);
  }
  if (type === 'ARCO_PROCEDURE') {
    return shell(documentTitle(type), `${company}
      <h2>1. Recepción</h2><p>Toda solicitud se registra en el canal oficial, se acusa recibo y se calcula su plazo sin declarar procedencia antes de verificar identidad y alcance.</p>
      <h2>2. Verificación y búsqueda</h2><p>El operador aplica un método proporcional de verificación, identifica sistemas y responsables, y solicita antecedentes mediante tareas trazables.</p>
      <h2>3. Revisión y respuesta</h2><p>La respuesta se consolida, revisa profesionalmente cuando corresponda y se somete a aprobación del responsable designado antes de enviarse.</p>
      <h2>4. Ejecución y cierre</h2><p>Las áreas confirman las acciones realizadas en sistemas. El expediente conserva comunicaciones, decisiones, evidencias y causa de cierre.</p>`);
  }
  return shell(documentTitle(type), `${company}
    <h2>1. Detección y escalamiento</h2><p>Quien detecte un incidente debe informar por el canal interno, preservar evidencias y evitar acciones que destruyan información útil para el análisis.</p>
    <h2>2. Evaluación</h2><p>El responsable de incidentes registra naturaleza, sistemas, categorías de datos, titulares potencialmente afectados, medidas adoptadas y riesgos.</p>
    <h2>3. Decisión y comunicaciones</h2><p>La necesidad y contenido de comunicaciones a autoridades o titulares requieren revisión profesional y aprobación del responsable designado.</p>
    <h2>4. Recuperación y cierre</h2><p>El equipo técnico contiene y recupera los sistemas. El expediente conserva línea temporal, decisiones, notificaciones, medidas correctivas y lecciones aprendidas.</p>`);
}
