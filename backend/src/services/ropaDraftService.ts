import { getDb } from '../database/db.js';

export async function createRopaDraft(
  userId: string,
  processName: string,
  purpose: string,
  legalBasis: string,
  dataCategories: string[],
  retentionPeriod: string,
  crossBorderTransfer: boolean,
  source: 'auto_scanner' | 'auto_questionnaire'
) {
  const db = getDb();
  try {
    // Check if a similar draft already exists to avoid duplicates (ignoring source)
    const dupCheck = await db.query(
      `SELECT id FROM ropa_inventory WHERE user_id = $1 AND process_name = $2`,
      [userId, processName]
    );

    if (dupCheck.rowCount === 0) {
      await db.query(
        `INSERT INTO ropa_inventory (user_id, process_name, purpose, legal_basis, data_categories, retention_period, cross_border_transfer, source, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')`,
        [
          userId,
          processName,
          purpose,
          legalBasis,
          JSON.stringify(dataCategories),
          retentionPeriod,
          crossBorderTransfer,
          source
        ]
      );
      console.log(`[RoPADraftService] Borrador '${processName}' inyectado para usuario ${userId}.`);
    }
  } catch (err: any) {
    console.error(`[RoPADraftService] Error al insertar borrador de RoPA:`, err.message);
  }
}

/**
 * Analiza los hallazgos del crawler tecnológico (cookies, formularios, pixels)
 * y sugiere borradores en el RoPA para evitar la fricción de "hoja en blanco".
 */
export async function analyzeScanResults(userId: string, scanResult: any) {
  if (!scanResult || !scanResult.findings) return;

  const findings = scanResult.findings as any[];
  
  // 1. Detectar cookies de analítica o píxeles de rastreo
  const hasAnalytics = findings.some(f => 
    f.id?.includes('google_analytics') || 
    f.id?.includes('trackers') || 
    f.description?.toLowerCase().includes('google analytics') || 
    f.description?.toLowerCase().includes('meta pixel')
  );

  if (hasAnalytics) {
    await createRopaDraft(
      userId,
      'Analítica Web y Rastreo',
      'Análisis estadístico del comportamiento de los usuarios en el sitio web, optimización de campañas de marketing y personalización de contenidos.',
      'Consentimiento',
      ['Datos de navegación', 'Identificadores de dispositivo'],
      '2 años',
      true, // Transferencia internacional por defecto (Google/Meta US)
      'auto_scanner'
    );
  }

  // 2. Detectar formularios de captación de prospectos
  const hasForms = findings.some(f => 
    f.id?.includes('forms') || 
    f.description?.toLowerCase().includes('formulario')
  );

  if (hasForms) {
    await createRopaDraft(
      userId,
      'Contacto y Registro de Prospectos',
      'Gestión de consultas de soporte, contacto comercial y captación de leads a través del sitio web.',
      'Consentimiento',
      ['Identificatorios (Nombre, Email, Teléfono)'],
      '5 años o hasta revocación del consentimiento',
      false,
      'auto_scanner'
    );
  }
}

/**
 * Analiza las respuestas declaradas en el diagnóstico interno
 * y sugiere borradores correspondientes en el RoPA.
 */
export async function analyzeQuestionnaireAnswers(userId: string, answers: any) {
  if (!answers) return;

  // 1. Detectar uso de cámaras de seguridad o videovigilancia
  const hasCctv = 
    (answers.vendors_transfer_types && answers.vendors_transfer_types.includes('cctv')) || 
    (answers.rrhh_attendance_tech && answers.rrhh_attendance_tech.includes('cctv')) || 
    (answers.rrhh_attendance_tech_other && answers.rrhh_attendance_tech_other.toLowerCase().includes('cctv')) ||
    (answers.vendors_transfer_types_other && answers.vendors_transfer_types_other.toLowerCase().includes('cctv')) ||
    (answers.vendors_transfer_types_other && answers.vendors_transfer_types_other.toLowerCase().includes('cámara')) ||
    (answers.vendors_transfer_types_other && answers.vendors_transfer_types_other.toLowerCase().includes('camara'));

  if (hasCctv) {
    await createRopaDraft(
      userId,
      'Cámaras de Videovigilancia (CCTV)',
      'Seguridad física, prevención de incidentes delictivos, control de accesos y seguridad de los trabajadores e instalaciones de la empresa.',
      'Interés Legítimo',
      ['Imágenes y Video (Biometría facial)', 'Datos de comportamiento físico'],
      '30 días (conforme a recomendaciones reguladoras)',
      false,
      'auto_questionnaire'
    );
  }

  // 2. Detectar almacenamiento de datos de RRHH / Nóminas
  const hasRrhh = answers.rrhh_storage_type && answers.rrhh_storage_type.length > 0;
  if (hasRrhh) {
    await createRopaDraft(
      userId,
      'Liquidación de Sueldos y Contratos (RRHH)',
      'Administración del personal, cálculo y pago de remuneraciones, cotizaciones de seguridad social, salud y control de licencias médicas laboral.',
      'Contrato',
      ['Identificatorios (Nombre, RUT, Dirección)', 'Financieros (Cuenta bancaria, sueldo)', 'Previsionales (AFP, Fonasa/Isapre)'],
      '5 años tras finalizar la relación laboral',
      false,
      'auto_questionnaire'
    );
  }

  // 3. Detectar almacenamiento de datos comerciales o CRM
  const hasCommercial = answers.commercial_db_type && answers.commercial_db_type.length > 0;
  if (hasCommercial) {
    await createRopaDraft(
      userId,
      'Base de Datos de Clientes y CRM',
      'Gestión comercial de la relación con el cliente, facturación de servicios, soporte posventa y envíos de boletines comerciales.',
      'Ejecución del Contrato',
      ['Identificatorios (Nombre, RUT, Email, Dirección)', 'Historial de compras y facturación'],
      '5 años desde la última transacción o baja del servicio',
      true, // Stripe, Salesforce, etc., se asume transferencia
      'auto_questionnaire'
    );
  }

  // 4. Analizar proveedores declarados en el inventario Shadow IT
  if (Array.isArray(answers.shadow_it_providers) && answers.shadow_it_providers.length > 0) {
    const providers = answers.shadow_it_providers as string[];

    // A. Marketing / CRM
    if (providers.some(p => ['hubspot', 'salesforce', 'mailchimp', 'activecampaign', 'sendgrid'].includes(p))) {
      await createRopaDraft(
        userId,
        'Gestión de Leads y Campañas de Marketing (SaaS)',
        'Envío de correos, gestión de oportunidades de venta y control de embudo comercial utilizando proveedores en la nube.',
        'Consentimiento / Interés Legítimo',
        ['Identificatorios (Nombre, Email, Teléfono)', 'Historial de interacción comercial'],
        '5 años tras la inactividad del lead',
        true,
        'auto_questionnaire'
      );
    }

    // B. Analytics / Tracking
    if (providers.some(p => ['google_analytics', 'meta_pixel', 'hotjar'].includes(p))) {
      await createRopaDraft(
        userId,
        'Rastreo y Analítica de Comportamiento Web',
        'Seguimiento estadístico de visitas, conversiones y comportamiento de usuarios en el portal institucional.',
        'Consentimiento',
        ['Identificadores de cookies', 'Direcciones IP y datos de navegación'],
        '2 años',
        true,
        'auto_questionnaire'
      );
    }

    // C. Infraestructura
    if (providers.some(p => ['aws', 'gcp', 'azure', 'digitalocean'].includes(p))) {
      await createRopaDraft(
        userId,
        'Alojamiento e Infraestructura en la Nube',
        'Almacenamiento general de bases de datos operativas de producción y backups de la infraestructura interna de la empresa.',
        'Ejecución del Contrato',
        ['Identificatorios (Cuentas de usuario)', 'Toda la información transaccional'],
        'Indefinido mientras dure el servicio comercial',
        true,
        'auto_questionnaire'
      );
    }

    // D. Comunicación y colaboración
    if (providers.some(p => ['google_workspace', 'office_365', 'zoom', 'slack'].includes(p))) {
      await createRopaDraft(
        userId,
        'Comunicaciones Corporativas y Colaboración Nube',
        'Gestión del correo electrónico corporativo, mensajería instantánea interna y videoconferencias operativas diarias.',
        'Interés Legítimo',
        ['Identificatorios (Email corporativo, Nombre)', 'Grabaciones y registros de chats'],
        'Indefinido durante la vigencia de la relación contractual o empleo',
        true,
        'auto_questionnaire'
      );
    }

    // E. Recursos Humanos
    if (providers.some(p => ['bamboohr', 'workday'].includes(p))) {
      await createRopaDraft(
        userId,
        'Plataforma SaaS de Gestión de Personas',
        'Administración y control interno de CVs, fichas de personal, vacaciones y evaluaciones de desempeño.',
        'Ejecución de Contrato',
        ['Identificatorios (RUT, Nombre, Dirección)', 'Historial de empleo y desempeño laboral'],
        '5 años tras la extinción del contrato de trabajo',
        true,
        'auto_questionnaire'
      );
    }

    // F. Soporte
    if (providers.some(p => ['zendesk', 'intercom'].includes(p))) {
      await createRopaDraft(
        userId,
        'Soporte y Atención de Clientes',
        'Gestión de tickets de ayuda, chat en vivo y resolución de reclamos de clientes en la plataforma.',
        'Ejecución del Contrato',
        ['Identificatorios (Nombre, Email)', 'Historial de tickets y transcripción de ayuda'],
        '3 años desde la resolución del caso',
        true,
        'auto_questionnaire'
      );
    }
  }
}
