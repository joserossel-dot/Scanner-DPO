export interface PolicyData {
  companyRut: string;
  address: string;
  contactEmail: string;
  dataCategories: string[];
  purposes: string[];
  retentionRules: string;
}

export const DISCLAIMER_V1 = `
<div class="legal-disclaimer" style="margin-top: 30px; padding: 15px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #64748b; text-align: justify; line-height: 1.4;">
  <strong>AVISO LEGAL (DISCLAIMER_V1):</strong> Este documento ha sido generado mediante la plataforma automatizada Scanner-DPO basada en las declaraciones e información provistas por el usuario. El presente modelo se entrega como plantilla de referencia técnica y de cumplimiento general de la Ley N° 21.719 de Chile. No constituye, bajo ninguna circunstancia, asesoría legal, tributaria o comercial formal. Se aconseja encarecidamente la validación y adaptación final de este instrumento por parte del equipo legal o asesores jurídicos de la organización antes de su firma, publicación o presentación ante la autoridad.
</div>
`;

export function generatePrivacyPolicy(data: PolicyData): string {
  const categoriesList = data.dataCategories.length > 0
    ? data.dataCategories.map((cat: string) => `<li><strong>${cat}</strong></li>`).join('')
    : '<li><strong>Datos Generales de Navegación</strong></li>';

  const purposesList = data.purposes.length > 0
    ? data.purposes.map((pur: string) => `<li><strong>${pur}</strong>: Tratamiento indispensable para cumplir con los fines operacionales declarados por la organización.</li>`).join('')
    : '<li><strong>Operación de Servicios</strong>: Procesamiento de consultas del sitio web.</li>';

  return `<div class="legal-document" style="font-family: 'Times New Roman', Times, serif; color: #1e293b; line-height: 1.6; max-width: 650px; margin: 0 auto; padding: 20px; font-size: 13.5px; text-align: justify;">
  <h1 style="text-align: center; color: #0f172a; font-size: 20px; margin-bottom: 6px; font-weight: bold; text-transform: uppercase;">
    POLÍTICA DE PRIVACIDAD Y TRATAMIENTO DE DATOS PERSONALES
  </h1>
  <p style="text-align: center; font-size: 11px; color: #64748b; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 0.5px;">
    <strong>Regulado bajo el Artículo 14 ter de la Ley N° 21.719 (Chile)</strong><br />
    Fecha de Emisión: ${new Date().toLocaleDateString('es-CL')}
  </p>
  
  <p style="margin-bottom: 15px;">
    La presente Política de Privacidad describe el tratamiento de datos personales efectuado por la organización responsable, de conformidad con lo establecido en la Ley N° 21.719 sobre Protección de la Vida Privada y la normativa nacional chilena vigente.
  </p>

  <h2 style="font-size: 14px; color: #0f172a; margin-top: 20px; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px;">
    1. Identificación del Responsable del Tratamiento
  </h2>
  <p style="margin-bottom: 12px;">
    El responsable del tratamiento de los datos recopilados es la entidad identificada ante el portal de administración del DPO con los siguientes antecedentes corporativos:
  </p>
  <ul style="margin-bottom: 15px; padding-left: 20px; list-style-type: square;">
    <li><strong>RUT de la Organización:</strong> ${data.companyRut}</li>
    <li><strong>Domicilio Legal:</strong> ${data.address}</li>
    <li><strong>Correo Electrónico de Contacto (DPO):</strong> <a href="mailto:${data.contactEmail}" style="color: #312e81; text-decoration: underline;">${data.contactEmail}</a></li>
  </ul>

  <h2 style="font-size: 14px; color: #0f172a; margin-top: 20px; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px;">
    2. Categorías de Datos Personales Tratados
  </h2>
  <p style="margin-bottom: 12px;">
    A través de nuestros canales digitales y formularios en línea, nuestra empresa recolecta y procesa las siguientes categorías de datos personales:
  </p>
  <ul style="margin-bottom: 15px; padding-left: 20px; list-style-type: disc;">
    ${categoriesList}
  </ul>

  <h2 style="font-size: 14px; color: #0f172a; margin-top: 20px; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px;">
    3. Finalidades Declaradas del Tratamiento
  </h2>
  <p style="margin-bottom: 12px;">
    Los datos de carácter personal recolectados serán tratados exclusivamente para las siguientes finalidades explícitas e informadas:
  </p>
  <ul style="margin-bottom: 15px; padding-left: 20px; list-style-type: disc;">
    ${purposesList}
  </ul>

  <h2 style="font-size: 14px; color: #0f172a; margin-top: 20px; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px;">
    4. Destinatarios y Transferencia Internacional de Datos
  </h2>
  <p style="margin-bottom: 15px;">
    Los datos personales podrán ser comunicados a proveedores de servicios tecnológicos necesarios para la operación de la plataforma (servidores en la nube, pasarelas de pago y herramientas de soporte) en el extranjero. Dicha transferencia internacional se regulariza mediante la firma de Cláusulas Contractuales Tipo (SCC) y convenios DPA conformes al Artículo 28 de la Ley N° 21.719, garantizando un estándar adecuado de privacidad.
  </p>

  <h2 style="font-size: 14px; color: #0f172a; margin-top: 20px; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px;">
    5. Plazo de Conservación de la Información
  </h2>
  <p style="margin-bottom: 12px;">
    De conformidad con los principios de proporcionalidad y limitación del plazo de conservación, los datos personales se mantendrán almacenados bajo el siguiente criterio temporal:
  </p>
  <blockquote style="margin: 0 0 15px 0; padding: 10px 15px; background-color: #f8fafc; border-left: 3px solid #64748b; font-style: italic; font-size: 12.5px; color: #475569;">
    "${data.retentionRules}"
  </blockquote>

  <h2 style="font-size: 14px; color: #0f172a; margin-top: 20px; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px;">
    6. Derechos del Titular de Datos (Derechos ARCO+)
  </h2>
  <p style="margin-bottom: 12px;">
    En virtud de la Ley N° 21.719, usted tiene el derecho legal de ejercer las siguientes prerrogativas sobre sus datos personales:
  </p>
  <ul style="margin-bottom: 15px; padding-left: 20px; list-style-type: decimal;">
    <li><strong>Acceso:</strong> Consultar qué datos de su titularidad son almacenados y las finalidades asignadas.</li>
    <li><strong>Rectificación:</strong> Solicitar la corrección o actualización de información inexacta.</li>
    <li><strong>Cancelación (Eliminación):</strong> Exigir la supresión de sus datos personales cuando ya no sean requeridos para los fines declarados.</li>
    <li><strong>Oposición:</strong> Negarse a que sus datos se utilicen para finalidades específicas ajenas a la relación contractual principal (ej. campañas comerciales).</li>
    <li><strong>Portabilidad:</strong> Solicitar una copia de su información en formatos estructurados y legibles.</li>
  </ul>
  <p style="margin-bottom: 15px;">
    Para el ejercicio formal de sus derechos, puede ingresar una solicitud a través del **Portal Público ARCO+** dispuesto en nuestro sitio web o bien contactar de forma directa a nuestro DPO escribiendo al correo: <a href="mailto:${data.contactEmail}" style="color: #312e81; text-decoration: underline;">${data.contactEmail}</a>.
  </p>
  ${DISCLAIMER_V1}
</div>`;
}
