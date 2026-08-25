import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveRiskCandidates } from './riskCandidateService.js';

test('derives traceable candidates without asserting a legal conclusion', () => {
  const result = deriveRiskCandidates([{ ropaId: 'ropa-1', flowId: 'flow-1', processName: 'Selección', containsSensitiveData: true, sensitiveCategories: ['Biometría', 'Datos de menores'], automatedDecisions: true, destinationCountries: ['US'], recipientRoles: ['Proveedor'], securityControls: [], processOwnerContactId: 'owner-1', flowEvidenceStatus: 'VERIFIED' }]);
  assert.deepEqual(new Set(result.map(item => item.signalCode)), new Set(['SENSITIVE_DATA', 'CHILDREN_DATA', 'BIOMETRIC_DATA', 'AUTOMATED_DECISIONS', 'INTERNATIONAL_TRANSFER', 'RECIPIENT_DISCLOSURE', 'CONTROL_GAP']));
  assert.ok(result.every(item => item.mitigationControl.length > 20));
  assert.ok(result.every(item => item.ownerContactId === 'owner-1' && item.evidenceStatus === 'VERIFIED'));
  assert.equal(new Set(result.map(item => item.candidateKey)).size, result.length);
});

test('does not create candidates from an ordinary controlled processing activity', () => {
  assert.deepEqual(deriveRiskCandidates([{ ropaId: 'ropa-2', flowId: 'flow-2', processName: 'Facturación', securityControls: ['MFA'] }]), []);
});
