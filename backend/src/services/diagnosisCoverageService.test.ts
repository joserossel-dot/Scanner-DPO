import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateDiagnosisCoverage } from './diagnosisCoverageService.js';

const empty = {
  hasOrganizationIdentity: false, hasResponsibleContact: false, hasWebScan: false,
  hasQuestionnaire: false, hasConfirmedRopa: false, hasPendingRopaDrafts: false,
  hasVerifiedFlows: false, processorsReviewed: false, transfersProtected: false,
  hasVerifiedRiskAssessment: false, hasVerifiedControls: false,
  hasApprovedCoreDocuments: false, hasConsentEvidence: false, hasTrainingEvidence: false
};

test('absence of evidence cannot produce a perfect diagnosis', () => {
  const result = evaluateDiagnosisCoverage(empty);
  assert.equal(result.score, 0);
  assert.equal(result.pending.length, result.total);
  assert.ok(result.pending.some(item => item.id === 'FIND_WEB_SCAN_PENDING'));
});

test('confirmed RoPA alone remains low coverage', () => {
  const result = evaluateDiagnosisCoverage({ ...empty, hasOrganizationIdentity: true, hasResponsibleContact: true, hasConfirmedRopa: true });
  assert.equal(result.score, 23);
  assert.ok(result.pending.some(item => item.id === 'FIND_DATA_FLOWS_EVIDENCE_PENDING'));
});

test('only complete evidence reaches one hundred percent', () => {
  const complete = Object.fromEntries(Object.keys(empty).map(key => [key, key === 'hasPendingRopaDrafts' ? false : true])) as unknown as typeof empty;
  const result = evaluateDiagnosisCoverage(complete);
  assert.equal(result.score, 100);
  assert.equal(result.pending.length, 0);
});
