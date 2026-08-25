import assert from 'node:assert/strict';
import test from 'node:test';
import { assessProcessingFlowCompleteness, PROCESSING_FLOW_FACTS, type CollectedFact } from './adaptiveQuestionnaireCoverage.js';

test('a scanner candidate never counts as a confirmed legal fact', () => {
  const result = assessProcessingFlowCompleteness([{ key: 'legal_basis', status: 'CANDIDATE', value: 'consentimiento' }]);
  assert.equal(result.complete, false);
  assert.ok(result.candidateOnlyKeys.includes('legal_basis'));
  assert.equal(result.facts.find(fact => fact.key === 'legal_basis')?.complete, false);
});

test('evidence-required and professional facts enforce different gates', () => {
  const facts: CollectedFact[] = [
    { key: 'data_categories', status: 'ANSWERED', value: ['email'] },
    { key: 'legal_basis', status: 'EVIDENCED', value: 'contrato', evidenceIds: ['contract-1'] }
  ];
  const result = assessProcessingFlowCompleteness(facts);
  assert.equal(result.facts.find(fact => fact.key === 'data_categories')?.complete, false);
  assert.equal(result.facts.find(fact => fact.key === 'legal_basis')?.complete, false);
  assert.ok(result.professionalReviewKeys.includes('legal_basis'));
});

test('a flow reaches 100 percent only with the required evidence and review', () => {
  const facts: CollectedFact[] = PROCESSING_FLOW_FACTS.map(definition => definition.requiredLevel === 'CLIENT_CONFIRMATION'
    ? { key: definition.key, status: 'ANSWERED', value: 'confirmado' }
    : definition.requiredLevel === 'EVIDENCE_REQUIRED'
      ? { key: definition.key, status: 'EVIDENCED', value: 'confirmado', evidenceIds: ['evidence-1'] }
      : { key: definition.key, status: 'REVIEWED', value: 'confirmado', evidenceIds: ['evidence-1'], reviewerId: 'reviewer-1' });
  const result = assessProcessingFlowCompleteness(facts);
  assert.equal(result.complete, true);
  assert.equal(result.confirmedPercent, 100);
  assert.deepEqual(result.missingKeys, []);
});
