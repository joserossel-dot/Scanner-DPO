import assert from 'node:assert/strict';
import test from 'node:test';
import { assessLegalDeliverables, MINIMUM_LEGAL_DELIVERABLES, type LegalEvidence } from './legalDeliverablesService.js';

const keys: Array<keyof LegalEvidence> = ['organization', 'governance', 'processingInventory', 'lawfulBasis', 'transparency', 'rightsProcedure', 'processors', 'internationalTransfers', 'retentionAndDeletion', 'securityMeasures', 'incidentResponse', 'riskAndImpactAssessment', 'consentEvidence', 'training', 'approvalsAndVersioning'];
const confirmed = Object.fromEntries(keys.map(key => [key, 'CONFIRMED'])) as unknown as LegalEvidence;

test('minimum package covers documents and operational registers', () => {
  assert.ok(MINIMUM_LEGAL_DELIVERABLES.length >= 10);
  assert.ok(MINIMUM_LEGAL_DELIVERABLES.every(item => item.requiredEvidence.length > 0 && item.operationalRecords.length > 0));
  assert.deepEqual(assessLegalDeliverables(confirmed).map(item => item.status), Array(MINIMUM_LEGAL_DELIVERABLES.length).fill('READY_FOR_APPROVAL'));
});
test('missing evidence blocks readiness and drafts require review', () => {
  const results = assessLegalDeliverables({ ...confirmed, processors: 'MISSING', lawfulBasis: 'DRAFT' });
  assert.equal(results.find(item => item.code === 'PROCESSORS')?.status, 'BLOCKED_BY_MISSING_EVIDENCE');
  assert.equal(results.find(item => item.code === 'TRANSPARENCY')?.status, 'DRAFT_REVIEW_REQUIRED');
});
