export const minimumDiscoveryFields = [
  'purpose', 'subjects', 'dataCategories', 'sources', 'legalBasis', 'sourceSystemId', 'movesBetweenSystems', 'sharesData', 'internationalTransfer',
  'retentionPeriod', 'retentionTrigger', 'deletionMethod', 'processOwner', 'technicalOwner',
  'securityControls', 'sensitiveData', 'automatedDecisions'
] as const;

const unknown = (value: unknown) => value === undefined || value === null || value === '' || value === 'UNKNOWN';

export function evaluateDiscoveryAnswers(answers: Record<string, any>) {
  const applicable: string[] = [...minimumDiscoveryFields];
  if (answers.movesBetweenSystems === true) applicable.push('destinationSystemId');
  if (answers.sharesData === true) applicable.push('externalPartyId', 'recipients', 'countries');
  if (answers.internationalTransfer === true) applicable.push('transferMechanism');
  if (answers.sensitiveData === true) applicable.push('sensitiveCategories');
  if (answers.automatedDecisions === true) applicable.push('automatedDecisionDetails');
  const unknownFields = applicable.filter(field => unknown(answers[field]));
  const completenessPercent = Math.round(((applicable.length - unknownFields.length) / applicable.length) * 100);
  return { applicable, unknownFields, completenessPercent, readyForReview: unknownFields.length === 0 };
}

export function mapAnswersToFlow(answers: Record<string, any>) {
  const evaluation = evaluateDiscoveryAnswers(answers);
  return {
    evaluation,
    flow: {
      direction: answers.direction || (answers.sharesData === true ? 'DISCLOSURE' : 'INTERNAL'),
      data_subject_categories: answers.subjects || [],
      data_categories: answers.dataCategories || [],
      data_sources: answers.sources || [],
      purpose: answers.purpose,
      legal_basis: answers.legalBasis,
      legal_basis_rationale: answers.legalBasisRationale || null,
      source_system_id: answers.sourceSystemId || null,
      destination_system_id: answers.destinationSystemId || null,
      external_party_id: answers.externalPartyId || null,
      recipient_roles: answers.recipients || [],
      destination_countries: answers.countries || [],
      transfer_mechanism: answers.transferMechanism === 'UNKNOWN' ? null : answers.transferMechanism || null,
      transfer_safeguards: answers.transferSafeguards || [],
      retention_period: answers.retentionPeriod,
      retention_trigger: answers.retentionTrigger,
      deletion_method: answers.deletionMethod,
      security_controls: answers.securityControls || [],
      process_owner_contact_id: answers.processOwner === 'UNKNOWN' ? null : answers.processOwner || null,
      technical_owner_contact_id: answers.technicalOwner === 'UNKNOWN' ? null : answers.technicalOwner || null,
      evidence_status: 'PENDING',
      review_status: 'DRAFT'
    },
    ropa: {
      contains_sensitive_data: answers.sensitiveData === true,
      sensitive_data_categories: answers.sensitiveCategories || [],
      automated_decisions: answers.automatedDecisions === true,
      automated_decision_details: answers.automatedDecisionDetails || null
    }
  };
}
