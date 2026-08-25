import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDiscoveryAnswers, mapAnswersToFlow } from './discoveryMapping.js';

const complete = {
  purpose: 'Gestionar contratos y despachos', subjects: ['CLIENTES'], dataCategories: ['IDENTIFICACION', 'CONTACTO'],
  sources: ['TITULAR'], legalBasis: 'CONTRATO', sourceSystemId: '33333333-3333-3333-3333-333333333333',
  movesBetweenSystems: false, sharesData: false, internationalTransfer: false,
  retentionPeriod: '5 años', retentionTrigger: 'término del contrato', deletionMethod: 'borrado seguro',
  processOwner: '11111111-1111-1111-1111-111111111111', technicalOwner: '22222222-2222-2222-2222-222222222222',
  securityControls: ['CONTROL_ACCESO'], sensitiveData: false, automatedDecisions: false
};

test('a complete ordinary process is ready for professional review', () => {
  const result = evaluateDiscoveryAnswers(complete);
  assert.equal(result.completenessPercent, 100);
  assert.equal(result.readyForReview, true);
});

test('unknown answers remain explicit gaps and are never guessed', () => {
  const result = mapAnswersToFlow({ ...complete, legalBasis: 'UNKNOWN', deletionMethod: 'UNKNOWN' });
  assert.deepEqual(result.evaluation.unknownFields.sort(), ['deletionMethod', 'legalBasis']);
  assert.equal(result.evaluation.readyForReview, false);
  assert.equal(result.flow.legal_basis, 'UNKNOWN');
});

test('branch questions become required only when applicable', () => {
  const result = evaluateDiscoveryAnswers({ ...complete, sharesData: true, externalPartyId: '44444444-4444-4444-4444-444444444444', recipients: ['ENCARGADO'], countries: 'UNKNOWN' });
  assert.ok(result.unknownFields.includes('countries'));
  assert.ok(!evaluateDiscoveryAnswers(complete).applicable.includes('countries' as any));
});

test('mapping uses the exact normalized data-flow fields', () => {
  const result = mapAnswersToFlow(complete);
  assert.deepEqual(result.flow.data_subject_categories, ['CLIENTES']);
  assert.equal(result.flow.retention_trigger, 'término del contrato');
  assert.equal(result.flow.process_owner_contact_id, complete.processOwner);
  assert.equal(result.ropa.contains_sensitive_data, false);
});
