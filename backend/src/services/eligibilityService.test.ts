import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateEligibility } from './eligibilityService.js';

const standardInput = {
  employeeCount: 50,
  operatesInChile: true,
  industries: ['RETAIL'],
  riskFactors: {}
};

test('accepts a standard SME profile', () => {
  const result = evaluateEligibility(standardInput);
  assert.equal(result.decision, 'STANDARD');
  assert.equal(result.rulesVersion, 'SME_SCOPE_V2');
});

test('routes excluded industries and complex processing to special assessment', () => {
  const result = evaluateEligibility({
    ...standardInput,
    industries: ['healthcare'],
    riskFactors: { biometrics: true }
  });
  assert.equal(result.decision, 'SPECIAL_ASSESSMENT');
  assert.equal(result.reasons.length, 2);
});

test('routes profiles outside the base package to separately scoped assessment', () => {
  assert.equal(evaluateEligibility({ ...standardInput, employeeCount: 150 }).decision, 'STANDARD_WITH_ADDON');
  assert.equal(evaluateEligibility({ ...standardInput, employeeCount: 251 }).decision, 'SPECIAL_ASSESSMENT');
  assert.equal(evaluateEligibility({ ...standardInput, operatesInChile: false }).decision, 'SPECIAL_ASSESSMENT');
});

test('rejects malformed employee counts', () => {
  assert.throws(() => evaluateEligibility({ ...standardInput, employeeCount: -1 }));
  assert.throws(() => evaluateEligibility({ ...standardInput, employeeCount: 4.5 }));
});
