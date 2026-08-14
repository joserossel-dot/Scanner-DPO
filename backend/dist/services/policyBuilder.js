import { DISCLAIMER_V1_TEXT } from '../constants/legalConstants.js';
// ─── Style constants ──────────────────────────────────────────────────────────
const H2 = `font-family: 'Times New Roman', Times, serif; font-size: 13px; color: #0f172a; margin-top: 24px; margin-bottom: 6px; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; letter-spacing: 0.3px;`;
const P = `margin-bottom: 12px; font-size: 13px; line-height: 1.7;`;
const LI = `margin-bottom: 4px; font-size: 13px;`;
const TH = `background-color: #1e293b; color: #f8fafc; padding: 7px 10px; font-size: 11.5px; text-align: left; border: 1px solid #334155;`;
const TD = `padding: 7px 10px; font-size: 12px; border: 1px solid #cbd5e1; vertical-align: top;`;
const BADGE = `display:inline-block; background:#312e81; color:#fff; font-size:10px; padding:2px 6px; border-radius:3px; font-weight:bold; letter-spacing:0.3px;`;
export function generatePrivacyPolicy(data) {
    const now = new Date().toLocaleDateString('es-CL');
    // ── Derived helpers ──────────────────────────────────────────────────────────
    const cats = data.dataCategories.length > 0 ? data.dataCategories : ['Datos de identificación y contacto'];
    const hasProviders = Array.isArray(data.providers) && data.providers.length > 0;
    const hasRopa = Array.isArray(data.ropaProcesses) && data.ropaProcesses.length > 0;
    // Determine primary purpose label for the summary table
    const primaryPurpose = data.purposes.length > 0
        ? data.purposes[0]
        : (hasRopa ? data.ropaProcesses[0].purpose : 'Prestación de Servicios');
    // Legitimation: scan legal_basis from ropa if available
    const allBases = hasRopa
        ? [...new Set(data.ropaProcesses.map(r => r.legal_basis).filter(Boolean))]
        : ['Ejecución del Contrato / Consentimiento del Titular'];
    const legitimation = allBases.join(' · ');
    // ARCO+ portal link
    const arcoUrl = data.tenantId
        ? `/arco?tenant=${data.tenantId}`
        : `mailto:${data.contactEmail}`;
    const arcoLinkHtml = data.tenantId
        ? `<a href="${arcoUrl}" style="color:#312e81;text-decoration:underline;">Portal ARCO+ (${arcoUrl})</a>`
        : `<a href="mailto:${data.contactEmail}" style="color:#312e81;text-decoration:underline;">${data.contactEmail}</a>`;
    // ── Summary table rows ───────────────────────────────────────────────────────
    const summaryRows = [
        ['Responsable del Tratamiento', `RUT ${data.companyRut} · ${data.address}`],
        ['Finalidad Principal', primaryPurpose],
        ['Base de Legitimación', legitimation],
        ['Destinatarios / Encargados', hasProviders ? data.providers.join(', ') : 'Proveedores internos de TI (sin transferencias a terceros)'],
        ['Derechos', `Acceso, Rectificación, Cancelación, Oposición, Portabilidad y Bloqueo (ARCO+)`],
        ['Contacto DPO', data.contactEmail],
    ].map(([label, value]) => `
    <tr>
      <td style="${TD} background-color:#f1f5f9; font-weight:bold; width:32%;">${label}</td>
      <td style="${TD}">${value}</td>
    </tr>`).join('');
    // ── Section 3: Finalidades from RoPA (granular) ──────────────────────────────
    const finalidadesHtml = hasRopa
        ? `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;">
        <thead>
          <tr>
            <th style="${TH}">Actividad de Tratamiento</th>
            <th style="${TH}">Finalidad</th>
            <th style="${TH}">Base Jurídica</th>
            <th style="${TH}">Plazo de Conservación</th>
          </tr>
        </thead>
        <tbody>
          ${data.ropaProcesses.map(r => `
          <tr>
            <td style="${TD}"><strong>${r.process_name}</strong></td>
            <td style="${TD}">${r.purpose}</td>
            <td style="${TD}"><span style="${BADGE}">${r.legal_basis}</span></td>
            <td style="${TD}">${r.retention_period}</td>
          </tr>`).join('')}
        </tbody>
      </table>`
        : `<ul style="padding-left:20px;list-style-type:disc;margin-bottom:16px;">
        ${data.purposes.map(p => `<li style="${LI}"><strong>${p}</strong></li>`).join('')}
       </ul>`;
    // ── Section 4: Destinatarios ─────────────────────────────────────────────────
    const internationalVendors = hasRopa
        ? data.ropaProcesses.filter(r => r.cross_border_transfer).map(r => r.process_name)
        : [];
    const hasInternational = hasProviders || internationalVendors.length > 0;
    const destinatariosHtml = hasProviders
        ? `<p style="${P}">Para la correcta prestación de servicios, compartimos datos con los siguientes <strong>Encargados de Tratamiento</strong>:</p>
       <ul style="padding-left:20px;list-style-type:disc;margin-bottom:12px;">
         ${data.providers.map(v => `<li style="${LI}"><strong>${v}</strong></li>`).join('')}
       </ul>
       ${hasInternational ? `<p style="${P} background-color:#fefce8; border-left:3px solid #ca8a04; padding:10px; color:#713f12;">
         <strong>⚠️ Transferencia Internacional (Art. 28 Ley N° 21.719):</strong>
         Algunas de estas transferencias se realizan fuera del territorio nacional (principalmente a servidores en Estados Unidos y/o la Unión Europea), amparadas en garantías adecuadas mediante Cláusulas Contractuales Tipo (SCC) y Acuerdos de Procesamiento de Datos (DPA).
       </p>` : ''}`
        : `<p style="${P}">Los datos personales no son comunicados a terceros ajenos a la organización, salvo obligación legal o prestadores de servicio de TI bajo estricta confidencialidad.</p>`;
    // ── Section 5: Conservación ──────────────────────────────────────────────────
    const conservacionHtml = hasRopa
        ? `<p style="${P}">Los plazos de conservación específicos por actividad se detallan en la tabla de finalidades (Sección 3). Con carácter general:</p>
       <blockquote style="margin:0 0 14px;padding:10px 15px;background:#f8fafc;border-left:3px solid #64748b;font-style:italic;font-size:12.5px;color:#475569;">"${data.retentionRules}"</blockquote>`
        : `<blockquote style="margin:0 0 14px;padding:10px 15px;background:#f8fafc;border-left:3px solid #64748b;font-style:italic;font-size:12.5px;color:#475569;">"${data.retentionRules}"</blockquote>`;
    // ── Compose full document ────────────────────────────────────────────────────
    return `<div class="legal-document" style="font-family:'Times New Roman',Times,serif;color:#1e293b;line-height:1.6;max-width:720px;margin:0 auto;padding:24px;font-size:13.5px;text-align:justify;">

  <!-- ═══ ENCABEZADO ═══════════════════════════════════════════════════════════ -->
  <h1 style="text-align:center;color:#0f172a;font-size:20px;margin-bottom:4px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">
    POLÍTICA DE PRIVACIDAD Y TRATAMIENTO DE DATOS PERSONALES
  </h1>
  <p style="text-align:center;font-size:10.5px;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.4px;">
    <strong>Regulada bajo la Ley N° 21.719 sobre Protección de Datos Personales (Chile)</strong><br />
    Fecha de Generación: ${now} · Versión: 2.0
  </p>
  <hr style="border:none;border-top:2px solid #1e293b;margin-bottom:20px;" />

  <!-- ═══ CUADRO RESUMEN (TABLA RGPD) ═════════════════════════════════════════ -->
  <h2 style="${H2}">📋 Cuadro Resumen — Información Clave</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <tbody>
      ${summaryRows}
    </tbody>
  </table>

  <!-- ═══ 1. RESPONSABLE DEL TRATAMIENTO ═══════════════════════════════════════ -->
  <h2 style="${H2}">1. Responsable del Tratamiento</h2>
  <p style="${P}">
    El <strong>Responsable del Tratamiento</strong> de los datos personales recopilados es la entidad identificada con los antecedentes corporativos indicados a continuación, en su calidad de titular de la plataforma:
  </p>
  <ul style="padding-left:20px;list-style-type:square;margin-bottom:16px;">
    <li style="${LI}"><strong>RUT:</strong> ${data.companyRut}</li>
    <li style="${LI}"><strong>Domicilio Legal:</strong> ${data.address}</li>
    <li style="${LI}"><strong>Delegado de Protección de Datos (DPO) / Contacto:</strong>
      <a href="mailto:${data.contactEmail}" style="color:#312e81;text-decoration:underline;">${data.contactEmail}</a>
    </li>
  </ul>

  <!-- ═══ 2. CATEGORÍAS DE DATOS TRATADOS ══════════════════════════════════════ -->
  <h2 style="${H2}">2. Categorías de Datos Personales Tratados</h2>
  <p style="${P}">
    La organización recopila y procesa, de conformidad con el principio de minimización de datos, las siguientes categorías de información personal:
  </p>
  <ul style="padding-left:20px;list-style-type:disc;margin-bottom:16px;">
    ${cats.map(c => `<li style="${LI}"><strong>${c}</strong></li>`).join('')}
  </ul>

  <!-- ═══ 3. FINALIDADES Y BASE DE LEGITIMACIÓN ═════════════════════════════════ -->
  <h2 style="${H2}">3. Finalidades del Tratamiento y Base de Legitimación</h2>
  <p style="${P}">
    Los datos personales son tratados <strong>exclusivamente</strong> para las actividades declaradas a continuación,
    cada una amparada en la base jurídica aplicable de conformidad con los artículos 12 y ss. de la Ley N° 21.719:
  </p>
  ${finalidadesHtml}

  <!-- ═══ 4. DESTINATARIOS Y TRANSFERENCIAS INTERNACIONALES ════════════════════ -->
  <h2 style="${H2}">4. Destinatarios y Transferencia Internacional de Datos</h2>
  ${destinatariosHtml}

  <!-- ═══ 5. PLAZO DE CONSERVACIÓN ════════════════════════════════════════════ -->
  <h2 style="${H2}">5. Plazo de Conservación de los Datos</h2>
  <p style="${P}">
    De conformidad con el principio de <strong>limitación del plazo de conservación</strong>,
    los datos serán almacenados únicamente durante el tiempo necesario para cumplir la finalidad declarada
    y/o durante el plazo exigido por normativa legal aplicable.
  </p>
  ${conservacionHtml}
  <p style="${P}">
    Transcurrido dicho período, se ejecutará un protocolo de <strong>destrucción segura</strong>
    (borrado irreversible o triturado físico), impidiendo su recuperación posterior.
  </p>

  <!-- ═══ 6. MEDIDAS DE SEGURIDAD ═════════════════════════════════════════════ -->
  <h2 style="${H2}">6. Medidas Técnicas y Organizativas de Seguridad</h2>
  <p style="${P}">
    El Responsable aplica, de forma continua, las siguientes medidas técnicas y organizativas con el objeto de
    garantizar un nivel de seguridad adecuado al riesgo, conforme al principio de seguridad activa de la Ley N° 21.719:
  </p>
  <ul style="padding-left:20px;list-style-type:disc;margin-bottom:16px;">
    <li style="${LI}">
      <strong>Cifrado en tránsito y reposo:</strong>
      Todos los datos son transmitidos bajo protocolos SSL/TLS y almacenados con cifrado AES-256 o equivalente.
    </li>
    <li style="${LI}">
      <strong>Control de Accesos basado en Roles (RBAC):</strong>
      El acceso a información personal queda restringido exclusivamente al personal autorizado con credenciales nominales
      y trazabilidad de acciones mediante logs de auditoría.
    </li>
    <li style="${LI}">
      <strong>Gestión de Incidentes:</strong>
      Contamos con un protocolo de respuesta ante brechas de seguridad que incluye notificación a la Agencia de Protección
      de Datos dentro del plazo legal (72 horas desde la detección del incidente).
    </li>
    <li style="${LI}">
      <strong>Evaluaciones de Impacto (EIPD):</strong>
      Para tratamientos de alto riesgo se realizan Evaluaciones de Impacto en la Protección de Datos previas a la implementación.
    </li>
    <li style="${LI}">
      <strong>Acuerdos con Encargados (DPA):</strong>
      Todos los proveedores que acceden a datos personales suscriben Acuerdos de Encargado de Tratamiento
      con cláusulas de confidencialidad y seguridad exigibles.
    </li>
  </ul>

  <!-- ═══ 7. DERECHOS DEL TITULAR (ARCO+) ══════════════════════════════════════ -->
  <h2 style="${H2}">7. Derechos del Titular (Derechos ARCO+)</h2>
  <p style="${P}">
    De conformidad con los artículos 5 y ss. de la Ley N° 21.719, el titular de los datos tiene derecho a ejercer
    en cualquier momento las siguientes prerrogativas respecto de sus datos personales:
  </p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
    <thead>
      <tr>
        <th style="${TH}">Derecho</th>
        <th style="${TH}">Descripción</th>
        <th style="${TH}">Plazo de Respuesta</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="${TD}"><strong>Acceso</strong></td>
        <td style="${TD}">Consultar qué datos se almacenan, su origen y las finalidades del tratamiento.</td>
        <td style="${TD}">30 días corridos</td>
      </tr>
      <tr>
        <td style="${TD}"><strong>Rectificación</strong></td>
        <td style="${TD}">Solicitar la corrección de datos inexactos, incompletos o desactualizados.</td>
        <td style="${TD}">30 días corridos</td>
      </tr>
      <tr>
        <td style="${TD}"><strong>Cancelación / Supresión</strong></td>
        <td style="${TD}">Exigir la eliminación de sus datos cuando ya no sean necesarios para la finalidad declarada.</td>
        <td style="${TD}">30 días corridos</td>
      </tr>
      <tr>
        <td style="${TD}"><strong>Oposición</strong></td>
        <td style="${TD}">Oponerse al tratamiento para finalidades específicas (ej. marketing directo).</td>
        <td style="${TD}">30 días corridos</td>
      </tr>
      <tr>
        <td style="${TD}"><strong>Portabilidad</strong></td>
        <td style="${TD}">Recibir sus datos en formato electrónico estructurado y legible por máquina.</td>
        <td style="${TD}">30 días corridos</td>
      </tr>
      <tr>
        <td style="${TD}"><strong>Bloqueo Temporal</strong></td>
        <td style="${TD}">Suspender el tratamiento mientras se tramita una rectificación u oposición.</td>
        <td style="${TD}"><strong>2 días hábiles</strong></td>
      </tr>
    </tbody>
  </table>
  <p style="${P}">
    Para ejercer formalmente cualquiera de estos derechos, el titular puede ingresar su solicitud a través de:
  </p>
  <ul style="padding-left:20px;list-style-type:square;margin-bottom:16px;">
    <li style="${LI}"><strong>Portal ARCO+ en línea:</strong> ${arcoLinkHtml}</li>
    <li style="${LI}"><strong>Correo Electrónico DPO:</strong>
      <a href="mailto:${data.contactEmail}" style="color:#312e81;text-decoration:underline;">${data.contactEmail}</a>
    </li>
  </ul>
  <p style="${P}">
    La solicitud debe identificar al titular y especificar el derecho a ejercer. En caso de denegación,
    el titular puede recurrir ante la <strong>Agencia de Protección de Datos Personales de Chile</strong>.
  </p>

  <!-- ═══ 8. MODIFICACIONES A LA POLÍTICA ═══════════════════════════════════════ -->
  <h2 style="${H2}">8. Modificaciones a esta Política</h2>
  <p style="${P}">
    El Responsable se reserva el derecho de actualizar esta Política de Privacidad para adaptarla a cambios
    normativos, jurisprudenciales o de operación interna. Cualquier modificación relevante será notificada
    mediante publicación en el sitio web o por correo electrónico al menos con 15 días de anticipación.
    La versión vigente siempre estará disponible en nuestra plataforma con indicación de la fecha de última actualización.
  </p>

  <!-- ═══ DISCLAIMER LEGAL ═════════════════════════════════════════════════════ -->
  <hr style="border:none;border-top:1px solid #94a3b8;margin:24px 0 12px;" />
  <p style="font-size:10.5px;color:#64748b;font-style:italic;line-height:1.5;text-align:left;">
    ${DISCLAIMER_V1_TEXT.replace(/\n/g, '<br />')}
  </p>

</div>`;
}
