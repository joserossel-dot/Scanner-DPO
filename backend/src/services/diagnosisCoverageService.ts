export interface DiagnosisCoverageInput {
  hasOrganizationIdentity: boolean;
  hasResponsibleContact: boolean;
  hasWebScan: boolean;
  hasQuestionnaire: boolean;
  hasConfirmedRopa: boolean;
  hasPendingRopaDrafts: boolean;
  hasVerifiedFlows: boolean;
  processorsReviewed: boolean;
  transfersProtected: boolean;
  hasVerifiedRiskAssessment: boolean;
  hasVerifiedControls: boolean;
  hasApprovedCoreDocuments: boolean;
  hasConsentEvidence: boolean;
  hasTrainingEvidence: boolean;
}

export interface DiagnosisCoverageCheck {
  id: string;
  met: boolean;
  category: string;
  severity: 'Grave' | 'Gravísima';
  description: string;
  recommendation: string;
  phase: 1 | 2 | 3;
}

export function evaluateDiagnosisCoverage(input: DiagnosisCoverageInput) {
  const checks: DiagnosisCoverageCheck[] = [
    { id: 'FIND_ORGANIZATION_IDENTITY_PENDING', met: input.hasOrganizationIdentity, category: 'Gobernanza', severity: 'Grave', description: 'Identidad legal de la organización pendiente de confirmación.', recommendation: 'Confirmar razón social e identificador tributario en el expediente.', phase: 3 },
    { id: 'FIND_RESPONSIBLE_PENDING', met: input.hasResponsibleContact, category: 'Gobernanza', severity: 'Grave', description: 'Responsable principal de privacidad pendiente.', recommendation: 'Designar y registrar al responsable principal del proceso de cumplimiento.', phase: 3 },
    { id: 'FIND_WEB_SCAN_PENDING', met: input.hasWebScan, category: 'Web', severity: 'Grave', description: 'Escaneo web pendiente o sin evidencia disponible.', recommendation: 'Ejecutar el escáner sobre el sitio operativo y revisar sus hallazgos.', phase: 1 },
    { id: 'FIND_QUESTIONNAIRE_PENDING', met: input.hasQuestionnaire, category: 'Gobernanza', severity: 'Grave', description: 'Cuestionario interno de descubrimiento pendiente.', recommendation: 'Completar el cuestionario con las áreas que conocen los procesos de la empresa.', phase: 3 },
    { id: input.hasPendingRopaDrafts ? 'FIND_ROPA_DRAFTS_PENDING' : 'FIND_ROPA_MISSING', met: input.hasConfirmedRopa && !input.hasPendingRopaDrafts, category: 'Gobernanza', severity: 'Gravísima', description: input.hasPendingRopaDrafts ? 'Existen borradores RoPA pendientes de revisión.' : 'Inventario RoPA confirmado no disponible.', recommendation: 'Revisar y confirmar las actividades de tratamiento en el inventario RoPA.', phase: 3 },
    { id: 'FIND_DATA_FLOWS_EVIDENCE_PENDING', met: input.hasVerifiedFlows, category: 'Gobernanza', severity: 'Grave', description: 'Flujos de datos sin confirmación y evidencia suficiente.', recommendation: 'Confirmar origen, destino, responsables, retención, eliminación, controles y evidencia de cada flujo.', phase: 3 },
    { id: 'FIND_PROCESSORS_REVIEW_PENDING', met: input.processorsReviewed, category: 'Contratos', severity: 'Grave', description: 'Proveedores o encargados pendientes de revisión contractual.', recommendation: 'Confirmar el inventario de terceros y el estado de sus condiciones de tratamiento de datos.', phase: 2 },
    { id: 'FIND_TRANSFER_REVIEW_PENDING', met: input.transfersProtected, category: 'international_transfers', severity: 'Grave', description: 'Transferencias internacionales pendientes de mecanismo y salvaguardas verificadas.', recommendation: 'Revisar países de destino, mecanismo aplicable, DPA/SCC y evidencia de implementación.', phase: 2 },
    { id: 'FIND_RISK_REVIEW_PENDING', met: input.hasVerifiedRiskAssessment, category: 'Riesgos', severity: 'Grave', description: 'Matriz de riesgos pendiente de revisión y evidencia.', recommendation: 'Revisar los riesgos candidatos, asignar responsables y vincular evidencia verificada.', phase: 3 },
    { id: 'FIND_CONTROLS_EVIDENCE_PENDING', met: input.hasVerifiedControls, category: 'Seguridad', severity: 'Grave', description: 'Controles aplicables pendientes de evaluación o evidencia.', recommendation: 'Evaluar los controles, documentar su aplicabilidad y respaldar su implementación.', phase: 3 },
    { id: 'FIND_DOCUMENTS_APPROVAL_PENDING', met: input.hasApprovedCoreDocuments, category: 'Documentos', severity: 'Grave', description: 'Paquete documental mínimo pendiente de aprobación.', recommendation: 'Generar, revisar y aprobar el aviso de privacidad, política, procedimiento ARCO+ y plan de incidentes.', phase: 2 },
    { id: 'FIND_CONSENT_EVIDENCE_PENDING', met: input.hasConsentEvidence, category: 'Consentimiento', severity: 'Grave', description: 'Evidencia operativa de preferencias o consentimientos no disponible.', recommendation: 'Configurar el mecanismo aplicable y verificar registros de preferencias, versiones y revocaciones.', phase: 1 },
    { id: 'FIND_TRAINING_EVIDENCE_PENDING', met: input.hasTrainingEvidence, category: 'Capacitación', severity: 'Grave', description: 'Capacitación del personal sin evidencia registrada.', recommendation: 'Ejecutar la capacitación aplicable y conservar asistencia y evaluaciones.', phase: 3 }
  ];

  const met = checks.filter(check => check.met).length;
  return {
    score: Math.round((met / checks.length) * 100),
    met,
    total: checks.length,
    checks,
    pending: checks.filter(check => !check.met)
  };
}
