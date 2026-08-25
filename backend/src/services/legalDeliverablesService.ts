import type { ManagedDocumentType } from './managedDocumentBuilder.js';

export type EvidenceStatus = 'MISSING' | 'DRAFT' | 'CONFIRMED';
export interface LegalEvidence {
  organization: EvidenceStatus; governance: EvidenceStatus; processingInventory: EvidenceStatus;
  lawfulBasis: EvidenceStatus; transparency: EvidenceStatus; rightsProcedure: EvidenceStatus;
  processors: EvidenceStatus; internationalTransfers: EvidenceStatus; retentionAndDeletion: EvidenceStatus;
  securityMeasures: EvidenceStatus; incidentResponse: EvidenceStatus; riskAndImpactAssessment: EvidenceStatus;
  consentEvidence: EvidenceStatus; training: EvidenceStatus; approvalsAndVersioning: EvidenceStatus;
}
export interface LegalDeliverable {
  code: string; name: string; documentType?: ManagedDocumentType;
  requiredEvidence: Array<keyof LegalEvidence>; operationalRecords: string[];
}

export const MINIMUM_LEGAL_DELIVERABLES: LegalDeliverable[] = [
  { code: 'GOVERNANCE', name: 'Política interna y gobierno de datos', documentType: 'DATA_PROTECTION_POLICY', requiredEvidence: ['organization', 'governance', 'processingInventory', 'securityMeasures', 'approvalsAndVersioning'], operationalRecords: ['designaciones', 'aprobaciones', 'versiones', 'revisiones periódicas'] },
  { code: 'ROPA', name: 'Inventario y registro de actividades de tratamiento', requiredEvidence: ['processingInventory', 'lawfulBasis', 'processors', 'internationalTransfers', 'retentionAndDeletion', 'securityMeasures'], operationalRecords: ['altas y cambios de tratamientos', 'evidencia de revisión', 'historial de versiones'] },
  { code: 'TRANSPARENCY', name: 'Política y avisos de privacidad', documentType: 'PRIVACY_NOTICE', requiredEvidence: ['organization', 'processingInventory', 'lawfulBasis', 'transparency', 'retentionAndDeletion'], operationalRecords: ['versiones publicadas', 'fecha y medio de comunicación'] },
  { code: 'RIGHTS', name: 'Procedimiento y registro de solicitudes de titulares', documentType: 'ARCO_PROCEDURE', requiredEvidence: ['governance', 'processingInventory', 'rightsProcedure'], operationalRecords: ['solicitud', 'identidad verificada', 'cómputo de plazo', 'decisión', 'respuesta', 'ejecución y evidencia'] },
  { code: 'PROCESSORS', name: 'Anexos y expediente de proveedores encargados', documentType: 'PROCESSOR_ANNEX', requiredEvidence: ['processors', 'securityMeasures', 'incidentResponse', 'retentionAndDeletion'], operationalRecords: ['debida diligencia', 'contrato', 'subencargados', 'ubicaciones', 'revisiones'] },
  { code: 'EMPLOYEES', name: 'Anexo laboral de protección de datos', documentType: 'EMPLOYEE_ANNEX', requiredEvidence: ['governance', 'securityMeasures', 'training'], operationalRecords: ['firma', 'entrega', 'capacitación', 'baja de accesos'] },
  { code: 'RETENTION', name: 'Política y matriz de conservación y eliminación', documentType: 'RETENTION_POLICY', requiredEvidence: ['processingInventory', 'retentionAndDeletion'], operationalRecords: ['ejecuciones de eliminación', 'excepciones y bloqueos', 'evidencia técnica'] },
  { code: 'INCIDENTS', name: 'Plan y registro de incidentes', documentType: 'INCIDENT_PLAYBOOK', requiredEvidence: ['governance', 'securityMeasures', 'incidentResponse'], operationalRecords: ['línea temporal', 'alcance', 'riesgo', 'decisiones', 'comunicaciones', 'medidas correctivas'] },
  { code: 'RISK', name: 'Matriz de riesgos y evaluaciones de impacto', requiredEvidence: ['processingInventory', 'securityMeasures', 'riskAndImpactAssessment'], operationalRecords: ['criterio de necesidad', 'evaluación', 'aprobación', 'riesgo residual', 'revisión'] },
  { code: 'CONSENT', name: 'Registro de consentimientos y revocaciones', requiredEvidence: ['lawfulBasis', 'consentEvidence'], operationalRecords: ['texto y versión', 'titular', 'acción afirmativa', 'fecha', 'canal', 'revocación'] }
];

export function assessLegalDeliverables(evidence: LegalEvidence) {
  return MINIMUM_LEGAL_DELIVERABLES.map(deliverable => {
    const missing = deliverable.requiredEvidence.filter(key => evidence[key] === 'MISSING');
    const draft = deliverable.requiredEvidence.filter(key => evidence[key] === 'DRAFT');
    return { ...deliverable,
      status: missing.length ? 'BLOCKED_BY_MISSING_EVIDENCE' as const : draft.length ? 'DRAFT_REVIEW_REQUIRED' as const : 'READY_FOR_APPROVAL' as const,
      missingEvidence: missing, draftEvidence: draft };
  });
}
