export interface ConfirmedProcessingFacts {
  ropaId: string;
  processName: string;
  containsSensitiveData?: boolean;
  sensitiveCategories?: unknown;
  automatedDecisions?: boolean;
  crossBorderTransfer?: boolean;
  flowId?: string;
  destinationCountries?: unknown;
  recipientRoles?: unknown;
  securityControls?: unknown;
  processOwnerContactId?: string | null;
  technicalOwnerContactId?: string | null;
  flowEvidenceStatus?: string | null;
}

export interface RiskCandidate {
  candidateKey: string;
  signalCode: string;
  processName: string;
  identifiedRisk: string;
  mitigationControl: string;
  originType: 'ROPA_SIGNAL' | 'FLOW_SIGNAL';
  ownerContactId: string | null;
  evidenceStatus: 'PENDING' | 'PARTIAL' | 'VERIFIED';
  sourceSnapshot: Record<string, unknown>;
}

const arrayValue = (value: unknown): string[] => Array.isArray(value)
  ? value.map(item => String(item).trim()).filter(Boolean)
  : [];

const specialCategorySignals = (categories: string[]) => {
  const normalized = categories.join(' ').toLocaleLowerCase('es-CL');
  return {
    children: /(menor|niñ|adolesc)/.test(normalized),
    biometrics: /(biom[eé]tr|biometr|huella|facial|iris|voz)/.test(normalized)
  };
};

export function deriveRiskCandidates(facts: ConfirmedProcessingFacts[]): RiskCandidate[] {
  const candidates = new Map<string, RiskCandidate>();
  const add = (fact: ConfirmedProcessingFacts, signalCode: string, identifiedRisk: string, mitigationControl: string, originType: RiskCandidate['originType'], source: Record<string, unknown>) => {
    const sourceId = originType === 'FLOW_SIGNAL' ? fact.flowId : fact.ropaId;
    if (!sourceId) return;
    const candidateKey = `${originType}:${sourceId}:${signalCode}`;
    candidates.set(candidateKey, {
      candidateKey, signalCode, processName: fact.processName, identifiedRisk, mitigationControl,
      originType, ownerContactId: fact.processOwnerContactId || fact.technicalOwnerContactId || null,
      evidenceStatus: fact.flowEvidenceStatus === 'VERIFIED' ? 'VERIFIED' : fact.flowEvidenceStatus === 'PARTIAL' ? 'PARTIAL' : 'PENDING',
      sourceSnapshot: { ropa_activity_id: fact.ropaId, flow_id: fact.flowId || null, signal: signalCode, ...source }
    });
  };

  for (const fact of facts) {
    const categories = arrayValue(fact.sensitiveCategories);
    const special = specialCategorySignals(categories);
    if (fact.containsSensitiveData || categories.length) add(fact, 'SENSITIVE_DATA', 'El uso confirmado de categorías sensibles requiere evaluar impactos y salvaguardas reforzadas.', 'Revisar necesidad, proporcionalidad, acceso, cifrado, trazabilidad y evidencia aplicable.', 'ROPA_SIGNAL', { sensitive_categories: categories });
    if (special.children) add(fact, 'CHILDREN_DATA', 'Las categorías confirmadas sugieren tratamiento de datos de niñas, niños o adolescentes que requiere revisión especializada.', 'Documentar edades, finalidad, información entregada, autorizaciones y salvaguardas aplicables.', 'ROPA_SIGNAL', { sensitive_categories: categories });
    if (special.biometrics) add(fact, 'BIOMETRIC_DATA', 'Las categorías confirmadas sugieren tratamiento biométrico que requiere evaluación específica.', 'Documentar necesidad, alternativa menos intrusiva, plantilla biométrica, acceso, retención y eliminación.', 'ROPA_SIGNAL', { sensitive_categories: categories });
    if (fact.automatedDecisions) add(fact, 'AUTOMATED_DECISIONS', 'El tratamiento declara decisiones automatizadas y requiere revisar efectos, lógica e intervención humana.', 'Documentar lógica, datos utilizados, efectos, pruebas, explicabilidad e intervención humana.', 'ROPA_SIGNAL', { automated_decisions: true });
    const countries = arrayValue(fact.destinationCountries);
    if (fact.crossBorderTransfer || countries.length) add(fact, 'INTERNATIONAL_TRANSFER', 'El tratamiento o flujo declara destinos internacionales y requiere revisar mecanismo y salvaguardas.', 'Identificar destinatario, país, finalidad, mecanismo, contrato, salvaguardas y revisión vigente.', fact.flowId ? 'FLOW_SIGNAL' : 'ROPA_SIGNAL', { destination_countries: countries });
    const recipients = arrayValue(fact.recipientRoles);
    if (recipients.length) add(fact, 'RECIPIENT_DISCLOSURE', 'El flujo confirmado comunica datos a destinatarios y requiere revisar necesidad, instrucciones y responsabilidades.', 'Validar destinatarios, rol, contrato, acceso mínimo, devolución o eliminación y evidencia.', 'FLOW_SIGNAL', { recipient_roles: recipients });
    const controls = arrayValue(fact.securityControls);
    if (fact.flowId && controls.length === 0) add(fact, 'CONTROL_GAP', 'El flujo confirmado no registra controles de seguridad concretos.', 'Asignar responsable, evaluar controles técnicos y organizativos, definir frecuencia y adjuntar evidencia.', 'FLOW_SIGNAL', { security_controls: controls });
  }
  return [...candidates.values()];
}
