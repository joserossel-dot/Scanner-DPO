export interface DiagnosisAnswers {
  rrhh_storage_type?: string;
  rrhh_storage_details?: string;
  rrhh_health_data?: string[];
  rrhh_destruction_proc?: string;
  rrhh_attendance_tech?: string;
  rrhh_biometric_consent?: string;
  rrhh_biometric_vendor?: string;
  
  commercial_db_type?: string;
  commercial_tool_volume?: string;
  commercial_server_country?: string;
  commercial_record_meetings?: string;
  commercial_record_notice?: string;

  ti_rbac_type?: string;
  ti_sensitive_access_roles?: string;
  ti_encryption_type?: string;
  ti_backup_frequency?: string;

  finances_debt_deletion?: string;
  finances_retention_rules?: string;

  vendors_transfer_types?: string[];
  vendors_main_names?: string;
  vendors_dpa_contracts?: string;
}

export interface DiagnosisFinding {
  id: string;
  category: string;
  severity: 'Leve' | 'Grave' | 'Gravísima';
  description: string;
  recommendation: string;
  penalty: number;
  riskUtm: number;
}

export interface ActionStep {
  step: number;
  title: string;
  description: string;
  priority: 'Alta' | 'Media' | 'Baja';
  estimatedEffort: string;
  details: string;
}

export interface EvaluationResult {
  scoreTotal: number;
  riesgoUTM: number;
  findings: DiagnosisFinding[];
  actionPlan: ActionStep[];
}

export function evaluateQuestionnaire(answers: DiagnosisAnswers): EvaluationResult {
  const findings: DiagnosisFinding[] = [];
  const actionPlan: ActionStep[] = [];
  let scoreTotal = 100;
  let maxRiskUtm = 0;
  let stepCounter = 1;

  // Rule 1: TI Database Encryption (Art. 14 quinquies)
  if (answers.ti_encryption_type === 'Sin cifrar') {
    const penalty = 20;
    const riskUtm = 10000;
    scoreTotal -= penalty;
    if (riskUtm > maxRiskUtm) maxRiskUtm = riskUtm;

    findings.push({
      id: 'FIND_TI_ENCRYPTION',
      category: 'Ciberseguridad',
      severity: 'Grave',
      description: 'Infracción Grave (Art. 14 quinquies) - Bases de datos principales sin cifrado activo en reposo.',
      recommendation: 'Implementar mecanismos de cifrado AES-256 en reposo para todos los servidores y backups conteniendo datos personales.',
      penalty,
      riskUtm
    });

    actionPlan.push({
      step: stepCounter++,
      title: 'Implementar cifrado AES-256',
      description: 'Cifrar bases de datos y respaldos de TI en reposo (Art. 14 quinquies).',
      priority: 'Alta',
      estimatedEffort: '4 horas',
      details: 'Habilitar el cifrado transparente de datos (TDE) en los proveedores cloud y discos locales.'
    });
  }

  // Rule 2: Vendors DPA Contracts (Art. 15 bis)
  if (answers.vendors_dpa_contracts === 'Ninguno') {
    const penalty = 15;
    const riskUtm = 10000;
    scoreTotal -= penalty;
    if (riskUtm > maxRiskUtm) maxRiskUtm = riskUtm;

    findings.push({
      id: 'FIND_VENDORS_DPA',
      category: 'Proveedores',
      severity: 'Grave',
      description: 'Infracción Grave (Art. 15 bis) - Proveedores y encargados de tratamiento operando sin acuerdo contractual DPA.',
      recommendation: 'Generar y firmar Anexos de Procesamiento de Datos (DPA) con todos los encargados externos.',
      penalty,
      riskUtm
    });

    actionPlan.push({
      step: stepCounter++,
      title: 'Generar y firmar Anexos DPA',
      description: 'Regularizar relación contractual con proveedores y procesadores de datos (Art. 15 bis).',
      priority: 'Alta',
      estimatedEffort: '2 días',
      details: 'Indexar anexos legales estandarizados para garantizar las obligaciones del Art. 15 bis de la ley.'
    });
  }

  // Rule 3: International Transfers (TID) without DPA (Art. 27 y 28)
  const isForeignServer = answers.commercial_server_country === 'EE.UU.' || 
                          (answers.commercial_server_country !== 'Chile' && 
                           answers.commercial_server_country !== 'Unión Europea');
  
  if (isForeignServer && answers.vendors_dpa_contracts === 'Ninguno') {
    const penalty = 25;
    const riskUtm = 20000;
    scoreTotal -= penalty;
    if (riskUtm > maxRiskUtm) maxRiskUtm = riskUtm;

    findings.push({
      id: 'FIND_ILLEGAL_TID',
      category: 'Transferencias_Internacionales',
      severity: 'Gravísima',
      description: 'Infracción Gravísima (Art. 27 y 28) - Transferencia Internacional de Datos Ilícita a países no adecuados sin salvaguardas.',
      recommendation: 'Firmar Cláusulas Contractuales Tipo (Standard Contractual Clauses - SCC) con proveedores extranjeros y regularizar ante la Agencia.',
      penalty,
      riskUtm
    });

    actionPlan.push({
      step: stepCounter++,
      title: 'Firmar Cláusulas Contractuales Tipo (SCC)',
      description: 'Establecer salvaguardas de protección para transferencias internacionales (Art. 28).',
      priority: 'Alta',
      estimatedEffort: '3 días',
      details: 'Completar y firmar el anexo modelo de Cláusulas Contractuales Tipo (SCC) con proveedores no adecuados.'
    });
  }

  // Rule 4: Prescribed debt deletion (Art. 17)
  if (answers.finances_debt_deletion === 'No se eliminan') {
    const penalty = 10;
    const riskUtm = 10000; // Grave
    scoreTotal -= penalty;
    if (riskUtm > maxRiskUtm) maxRiskUtm = riskUtm;

    findings.push({
      id: 'FIND_DEBT_RETENTION',
      category: 'Finanzas',
      severity: 'Grave',
      description: 'Infracción Grave (Art. 17) - Retención ilegal de datos de deudas ya prescriptas en bases de cobranza comercial.',
      recommendation: 'Implementar un procedimiento automático de depuración y olvido para deudas que hayan superado el plazo legal de prescripción.',
      penalty,
      riskUtm
    });

    actionPlan.push({
      step: stepCounter++,
      title: 'Depurar deudas prescriptas',
      description: 'Implementar protocolos de eliminación de deudas financieras prescriptas (Art. 17).',
      priority: 'Media',
      estimatedEffort: '1 día',
      details: 'Ejecutar procesos automáticos de eliminación o anonimización de registros financieros según las reglas del Art. 17.'
    });
  }

  // Cap score between 0 and 100
  scoreTotal = Math.max(0, Math.min(100, scoreTotal));

  return {
    scoreTotal,
    riesgoUTM: maxRiskUtm,
    findings,
    actionPlan
  };
}
