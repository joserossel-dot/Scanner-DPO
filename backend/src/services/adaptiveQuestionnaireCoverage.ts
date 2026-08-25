export type FactReviewLevel = 'CLIENT_CONFIRMATION' | 'EVIDENCE_REQUIRED' | 'PROFESSIONAL_REVIEW';
export type CollectedFactStatus = 'MISSING' | 'CANDIDATE' | 'ANSWERED' | 'EVIDENCED' | 'REVIEWED';

export interface QuestionnaireFact {
  key: string;
  group: 'IDENTITY' | 'PROCESSING' | 'LEGALITY' | 'SHARING' | 'LIFECYCLE' | 'SECURITY' | 'RIGHTS' | 'SPECIAL_CASES';
  clientQuestion: string;
  legalReference: string;
  candidateSources: string[];
  evidenceExamples: string[];
  requiredLevel: FactReviewLevel;
}

export const PROCESSING_FLOW_FACTS: QuestionnaireFact[] = [
  { key: 'controller_identity', group: 'IDENTITY', clientQuestion: '¿Qué empresa decide para qué y cómo se usan estos datos?', legalReference: 'Ley 19.628, arts. 2 y 14 ter, versión 01-12-2026', candidateSources: ['ficha de empresa', 'sitio web'], evidenceExamples: ['RUT o escritura', 'mandato o estructura del grupo'], requiredLevel: 'EVIDENCE_REQUIRED' },
  { key: 'privacy_contact', group: 'IDENTITY', clientQuestion: '¿Qué persona o canal recibirá consultas y solicitudes sobre datos personales?', legalReference: 'Ley 19.628, arts. 5 y 14 ter, versión 01-12-2026', candidateSources: ['política publicada', 'correo del sitio'], evidenceExamples: ['designación interna', 'cuenta de correo habilitada'], requiredLevel: 'EVIDENCE_REQUIRED' },
  { key: 'process_name_owner', group: 'PROCESSING', clientQuestion: '¿Qué actividad de la empresa usa los datos y quién responde internamente por ella?', legalReference: 'Ley 19.628, arts. 3 y 14 quinquies, versión 01-12-2026', candidateSources: ['organigrama', 'cuestionario por área'], evidenceExamples: ['procedimiento', 'designación del dueño de proceso'], requiredLevel: 'EVIDENCE_REQUIRED' },
  { key: 'purpose', group: 'PROCESSING', clientQuestion: '¿Para qué resultado concreto utiliza la empresa estos datos?', legalReference: 'Ley 19.628, art. 3, principios de finalidad y proporcionalidad, versión 01-12-2026', candidateSources: ['texto de formulario', 'contrato', 'descripción de proceso'], evidenceExamples: ['procedimiento aprobado', 'aviso entregado al titular'], requiredLevel: 'CLIENT_CONFIRMATION' },
  { key: 'data_subjects', group: 'PROCESSING', clientQuestion: '¿De qué personas son los datos, por ejemplo clientes, trabajadores, postulantes o contactos de proveedores?', legalReference: 'Ley 19.628, arts. 2 y 3, versión 01-12-2026', candidateSources: ['formularios', 'nombres de bases'], evidenceExamples: ['diccionario de datos', 'muestra anonimizada'], requiredLevel: 'CLIENT_CONFIRMATION' },
  { key: 'data_categories', group: 'PROCESSING', clientQuestion: '¿Qué datos exactos se recopilan o generan?', legalReference: 'Ley 19.628, arts. 2, 3 y 15 ter, versión 01-12-2026', candidateSources: ['campos HTML', 'esquema de base', 'planilla'], evidenceExamples: ['diccionario de datos', 'captura de campos', 'esquema del sistema'], requiredLevel: 'EVIDENCE_REQUIRED' },
  { key: 'source_collection', group: 'PROCESSING', clientQuestion: '¿De dónde obtiene la empresa los datos y cómo los recopila?', legalReference: 'Ley 19.628, arts. 3, 12 y 14 ter, versión 01-12-2026', candidateSources: ['formulario web', 'integración detectada'], evidenceExamples: ['formulario vigente', 'contrato de origen', 'especificación de integración'], requiredLevel: 'EVIDENCE_REQUIRED' },
  { key: 'legal_basis', group: 'LEGALITY', clientQuestion: '¿Qué autoriza a la empresa a usar los datos para esta finalidad: contrato, obligación legal, consentimiento u otra razón?', legalReference: 'Ley 19.628, arts. 12 y 13, versión 01-12-2026', candidateSources: ['casilla de consentimiento', 'contrato', 'norma citada'], evidenceExamples: ['texto y registro del consentimiento', 'contrato', 'norma aplicable'], requiredLevel: 'PROFESSIONAL_REVIEW' },
  { key: 'transparency', group: 'LEGALITY', clientQuestion: '¿Qué información se entrega a la persona antes o al momento de obtener sus datos?', legalReference: 'Ley 19.628, arts. 3 y 14 ter, versión 01-12-2026', candidateSources: ['política o aviso web'], evidenceExamples: ['versión del aviso', 'fecha y medio de entrega'], requiredLevel: 'EVIDENCE_REQUIRED' },
  { key: 'systems_locations', group: 'SHARING', clientQuestion: '¿En qué sistemas, equipos, planillas o archivos se guardan y usan los datos?', legalReference: 'Ley 19.628, arts. 2, 14 quinquies y 14 sexies, versión 01-12-2026', candidateSources: ['scripts web', 'integraciones', 'inventario TI'], evidenceExamples: ['inventario de activos', 'diagrama de arquitectura'], requiredLevel: 'EVIDENCE_REQUIRED' },
  { key: 'recipients_processors', group: 'SHARING', clientQuestion: '¿Qué otras empresas, proveedores o personas reciben o pueden acceder a los datos?', legalReference: 'Ley 19.628, arts. 14 ter y 15 bis, versión 01-12-2026', candidateSources: ['trackers', 'dominios externos', 'facturas de proveedores'], evidenceExamples: ['contrato', 'anexo de tratamiento', 'lista de subencargados'], requiredLevel: 'EVIDENCE_REQUIRED' },
  { key: 'international_transfer', group: 'SHARING', clientQuestion: '¿Los datos o sus copias pueden salir de Chile o ser accedidos desde otro país?', legalReference: 'Ley 19.628, reglas de transferencia internacional incorporadas por Ley 21.719, versión 01-12-2026', candidateSources: ['región cloud', 'dominio del proveedor'], evidenceExamples: ['ubicaciones contractuales', 'mecanismo de transferencia', 'evaluación del país o garantías'], requiredLevel: 'PROFESSIONAL_REVIEW' },
  { key: 'retention_deletion', group: 'LIFECYCLE', clientQuestion: '¿Hasta cuándo se necesitan los datos y cómo se eliminan, bloquean o anonimizan después?', legalReference: 'Ley 19.628, arts. 3, 6 y 14 quinquies, versión 01-12-2026', candidateSources: ['política declarada', 'configuración del sistema'], evidenceExamples: ['tabla de retención', 'registro de eliminación', 'configuración y respaldo'], requiredLevel: 'EVIDENCE_REQUIRED' },
  { key: 'security_controls', group: 'SECURITY', clientQuestion: '¿Qué medidas concretas evitan accesos, pérdidas, cambios o divulgaciones no autorizadas?', legalReference: 'Ley 19.628, arts. 3, 14 quinquies y 14 sexies, versión 01-12-2026', candidateSources: ['cabeceras web', 'configuración visible'], evidenceExamples: ['matriz de accesos', 'respaldo probado', 'registro de parches', 'contrato de seguridad'], requiredLevel: 'EVIDENCE_REQUIRED' },
  { key: 'rights_execution', group: 'RIGHTS', clientQuestion: '¿Cómo se buscarán, corregirán, entregarán, bloquearán o eliminarán los datos cuando una persona lo solicite?', legalReference: 'Ley 19.628, arts. 4 a 11, versión 01-12-2026', candidateSources: ['enlace o formulario de derechos'], evidenceExamples: ['procedimiento', 'caso de prueba', 'registro de solicitud y respuesta'], requiredLevel: 'EVIDENCE_REQUIRED' },
  { key: 'sensitive_children_biometrics', group: 'SPECIAL_CASES', clientQuestion: '¿Se usan datos de salud, biométricos, sensibles, de niñas, niños o adolescentes?', legalReference: 'Ley 19.628, categorías especiales de datos, versión 01-12-2026', candidateSources: ['nombres de campos', 'texto del formulario'], evidenceExamples: ['evaluación del tratamiento', 'mecanismo de autorización', 'controles reforzados'], requiredLevel: 'PROFESSIONAL_REVIEW' },
  { key: 'profiling_automated_decisions', group: 'SPECIAL_CASES', clientQuestion: '¿Se crean perfiles o se toman decisiones importantes sobre personas usando reglas o sistemas automáticos?', legalReference: 'Ley 19.628, derechos relativos a decisiones automatizadas, versión 01-12-2026', candidateSources: ['herramientas de analítica', 'motor de reglas'], evidenceExamples: ['lógica y datos usados', 'evaluación de impacto', 'mecanismo de intervención'], requiredLevel: 'PROFESSIONAL_REVIEW' },
  { key: 'risk_impact', group: 'SPECIAL_CASES', clientQuestion: '¿Qué daño podría sufrir una persona si los datos se usan mal, se pierden o se divulgan?', legalReference: 'Ley 19.628, deberes de seguridad y evaluación de impacto, versión 01-12-2026', candidateSources: ['incidentes', 'clasificación de datos'], evidenceExamples: ['matriz de riesgos', 'evaluación de impacto', 'aprobación del riesgo residual'], requiredLevel: 'PROFESSIONAL_REVIEW' }
];

export interface CollectedFact { key: string; status: CollectedFactStatus; value?: unknown; evidenceIds?: string[]; reviewerId?: string; }

function levelSatisfied(fact: QuestionnaireFact, collected?: CollectedFact): boolean {
  if (!collected || collected.status === 'MISSING' || collected.status === 'CANDIDATE') return false;
  if (fact.requiredLevel === 'CLIENT_CONFIRMATION') return ['ANSWERED', 'EVIDENCED', 'REVIEWED'].includes(collected.status);
  if (fact.requiredLevel === 'EVIDENCE_REQUIRED') return ['EVIDENCED', 'REVIEWED'].includes(collected.status) && Boolean(collected.evidenceIds?.length);
  return collected.status === 'REVIEWED' && Boolean(collected.reviewerId) && Boolean(collected.evidenceIds?.length);
}

export function assessProcessingFlowCompleteness(collectedFacts: CollectedFact[]) {
  const byKey = new Map(collectedFacts.map(fact => [fact.key, fact]));
  const facts = PROCESSING_FLOW_FACTS.map(definition => ({ ...definition, collected: byKey.get(definition.key), complete: levelSatisfied(definition, byKey.get(definition.key)) }));
  const completeCount = facts.filter(fact => fact.complete).length;
  return {
    complete: completeCount === facts.length,
    confirmedPercent: Math.round((completeCount / facts.length) * 100),
    facts,
    missingKeys: facts.filter(fact => !fact.complete).map(fact => fact.key),
    candidateOnlyKeys: facts.filter(fact => fact.collected?.status === 'CANDIDATE').map(fact => fact.key),
    professionalReviewKeys: facts.filter(fact => fact.requiredLevel === 'PROFESSIONAL_REVIEW' && !fact.complete).map(fact => fact.key)
  };
}
