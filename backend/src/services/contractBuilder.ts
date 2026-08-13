export const DISCLAIMER_V1 = `
<div class="legal-disclaimer" style="margin-top: 30px; padding: 15px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #64748b; text-align: justify; line-height: 1.4;">
  <strong>AVISO LEGAL (DISCLAIMER_V1):</strong> Este documento ha sido generado mediante la plataforma automatizada Scanner-DPO basada en las declaraciones e información provistas por el usuario. El presente modelo se entrega como plantilla de referencia técnica y de cumplimiento general de la Ley N° 21.719 de Chile. No constituye, bajo ninguna circunstancia, asesoría legal, tributaria o comercial formal. Se aconseja encarecidamente la validación y adaptación final de este instrumento por parte del equipo legal o asesores jurídicos de la organización antes de su firma, publicación o presentación ante la autoridad.
</div>
`;

export interface ContractData {
  clientName: string;
  clientRut: string;
  clientAddress: string;
  clientRepresentative: string;
  
  vendorName: string;
  vendorCountry: string;
  vendorAddress: string;
  
  dataCategories: string[];
  contractType: 'DPA_LOCAL' | 'SCC_INTERNATIONAL';
}

export function generateContractText(data: ContractData): string {
  const dateStr = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const categoriesText = data.dataCategories && data.dataCategories.length > 0
    ? data.dataCategories.join(', ')
    : 'Datos de contacto, logs de navegación y cookies analíticas';

  if (data.contractType === 'SCC_INTERNATIONAL') {
    // Modelo B: SCC Internacional (Art. 28)
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.6; color: #1e293b; padding: 20px; }
    h1 { text-align: center; font-size: 20px; text-transform: uppercase; margin-bottom: 20px; font-weight: bold; }
    h2 { font-size: 14px; text-transform: uppercase; margin-top: 20px; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    p { margin-bottom: 12px; text-align: justify; font-size: 13px; }
    .party-block { background: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 15px; font-size: 13px; }
    .footer-signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; }
    .signature-line { border-top: 1px solid #1e293b; width: 45%; text-align: center; padding-top: 8px; font-size: 12px; margin-top: 60px; }
  </style>
</head>
<body>
  <h1>Cláusulas Contractuales Tipo (SCC)</h1>
  <p style="text-align: center; font-style: italic; font-size: 12px;">Para la Transferencia Internacional de Datos Personales (Art. 27 y 28 de la Ley N° 21.719 de Chile)</p>
  
  <p>Con fecha <strong>${dateStr}</strong>, las partes detalladas a continuación acuerdan suscribir el presente Contrato de Transferencia Internacional de Datos:</p>

  <div class="party-block">
    <strong>EXPORTADOR DE DATOS (Responsable del Tratamiento):</strong><br/>
    Razón Social: ${data.clientName}<br/>
    RUT: ${data.clientRut}<br/>
    Domicilio: ${data.clientAddress}<br/>
    Representante Legal: ${data.clientRepresentative}
  </div>

  <div class="party-block">
    <strong>IMPORTADOR DE DATOS (Encargado del Tratamiento):</strong><br/>
    Proveedor: ${data.vendorName}<br/>
    Jurisdicción de Destino: ${data.vendorCountry}<br/>
    Domicilio: ${data.vendorAddress || 'No especificado'}
  </div>

  <h2>Cláusula 1: Ámbito de Aplicación y Objeto</h2>
  <p>El presente acuerdo rige la transferencia internacional desde el Exportador al Importador de los siguientes datos personales: <em>${categoriesText}</em>. Las actividades de tratamiento se realizarán exclusivamente para la provisión de los servicios SaaS contratados por el Responsable.</p>

  <h2>Cláusula 2: Obligaciones del Importador (Encargado en el extranjero)</h2>
  <p>El Importador se compromete y garantiza tratar los datos personales exportados única y exclusivamente bajo las instrucciones directas del Exportador, prohibiéndose cualquier uso para fines propios, comercialización o transferencia a terceros sin consentimiento previo.</p>
  <p>Asimismo, el Importador declara contar con medidas técnicas y organizativas adecuadas para garantizar la confidencialidad, integridad y disponibilidad de la información transferida, en conformidad con los estándares del Art. 28 de la Ley N° 21.719 de Chile.</p>

  <h2>Cláusula 3: Notificación de Brechas de Seguridad</h2>
  <p>Ante la ocurrencia de cualquier incidente de seguridad, ataque de ransomware, pérdida física de equipos o acceso no autorizado a las bases de datos personales del Exportador, el Importador deberá notificar de inmediato a este último dentro de un plazo máximo de 24 horas, cooperando activamente en la recopilación de antecedentes y mitigación de daños.</p>

  <h2>Cláusula 4: Sometimiento a la Autoridad de Control</h2>
  <p>Ambas partes acuerdan someterse expresamente a la supervisión, requerimientos e instrucciones de la <strong>Agencia de Protección de Datos Personales de Chile</strong> ante cualquier reclamación o auditoría legal vinculada al flujo transfronterizo regulado en este acto.</p>

  <div class="footer-signatures">
    <div className="signature-line">
      Por el Exportador: <strong>${data.clientName}</strong><br/>
      Firma y Timbre
    </div>
    <div className="signature-line">
      Por el Importador: <strong>${data.vendorName}</strong><br/>
      Firma y Timbre
    </div>
  </div>
  ${DISCLAIMER_V1}
</body>
</html>`;
  } else {
    // Modelo A: DPA Local (Art. 15 bis)
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.6; color: #1e293b; padding: 20px; }
    h1 { text-align: center; font-size: 20px; text-transform: uppercase; margin-bottom: 20px; font-weight: bold; }
    h2 { font-size: 14px; text-transform: uppercase; margin-top: 20px; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #slate-300; padding-bottom: 4px; }
    p { margin-bottom: 12px; text-align: justify; font-size: 13px; }
    .party-block { background: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 15px; font-size: 13px; }
    .footer-signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; }
    .signature-line { border-top: 1px solid #1e293b; width: 45%; text-align: center; padding-top: 8px; font-size: 12px; margin-top: 60px; }
  </style>
</head>
<body>
  <h1>Acuerdo de Procesamiento de Datos (DPA)</h1>
  <p style="text-align: center; font-style: italic; font-size: 12px;">Anexo de Tratamiento de Datos Personales (Art. 15 bis de la Ley N° 21.719 de Chile)</p>
  
  <p>Con fecha <strong>${dateStr}</strong>, las partes detalladas a continuación suscriben el presente Anexo al Contrato de Prestación de Servicios Principal:</p>

  <div class="party-block">
    <strong>RESPONSABLE DEL TRATAMIENTO:</strong><br/>
    Razón Social: ${data.clientName}<br/>
    RUT: ${data.clientRut}<br/>
    Domicilio: ${data.clientAddress}<br/>
    Representante Legal: ${data.clientRepresentative}
  </div>

  <div class="party-block">
    <strong>ENCARGADO DEL TRATAMIENTO:</strong><br/>
    Proveedor: ${data.vendorName}<br/>
    Domicilio: ${data.vendorAddress || 'No especificado'}<br/>
    País de Operación: ${data.vendorCountry}
  </div>

  <h2>Cláusula 1: Objeto y Ámbito</h2>
  <p>El presente Anexo (DPA) establece las condiciones de privacidad aplicables al tratamiento de datos personales que el Encargado realiza por cuenta del Responsable. Las categorías de datos tratadas son: <em>${categoriesText}</em>.</p>

  <h2>Cláusula 2: Deber de Confidencialidad y Uso Limitado</h2>
  <p>El Encargado se obliga expresamente a mantener estricto secreto y confidencialidad respecto de todos los datos personales a los que tenga acceso en el marco de la prestación de servicios. Los datos serán tratados única y exclusivamente para cumplir con el objeto del contrato principal, prohibiéndose su comercialización, cesión o explotación para finalidades propias.</p>

  <h2>Cláusula 3: Medidas de Ciberseguridad y Control</h2>
  <p>El Encargado implementará las medidas de seguridad lógicas, físicas y organizativas necesarias para evitar la alteración, pérdida, tratamiento o acceso no autorizado de los datos. Esto incluye la gestión de accesos restringidos mediante perfiles (RBAC) y la adopción de protocolos seguros de conectividad.</p>

  <h2>Cláusula 4: Notificación y Gestión de Brechas</h2>
  <p>Ante cualquier evento de ransomware, hacking, robo de credenciales o suplantación que afecte la integridad de las bases de datos personales bajo custodia del Encargado, este informará de inmediato al Responsable en un plazo que no excederá las 24 horas hábiles, cooperando de buena fe para subsanar y mitigar los efectos.</p>

  <div class="footer-signatures">
    <div className="signature-line">
      Por el Responsable (Cliente): <strong>${data.clientName}</strong><br/>
      Firma y Timbre
    </div>
    <div className="signature-line">
      Por el Encargado (Proveedor): <strong>${data.vendorName}</strong><br/>
      Firma y Timbre
    </div>
  </div>
  ${DISCLAIMER_V1}
</body>
</html>`;
  }
}
