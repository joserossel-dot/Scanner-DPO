import assert from 'node:assert/strict';
import test from 'node:test';
import { collectHealth } from './healthService.js';

test('reports ok when every dependency is available', async () => {
  const health = await collectHealth({
    async checkDatabase() {},
    async checkRateLimitStore() {}
  });

  assert.deepEqual(health, {
    status: 'ok',
    checks: { process: 'ok', database: 'ok', rateLimitStore: 'ok' }
  });
});

test('reports only a safe degraded status when a dependency fails', async () => {
  const health = await collectHealth({
    async checkDatabase() { throw new Error('postgres://user:secret@private-host/database'); },
    async checkRateLimitStore() {}
  });

  assert.deepEqual(health, {
    status: 'degraded',
    checks: { process: 'ok', database: 'error', rateLimitStore: 'ok' }
  });
  assert.doesNotMatch(JSON.stringify(health), /secret|private-host/);
});

test('bounds dependency checks with a timeout', async () => {
  const health = await collectHealth({
    async checkDatabase() { await new Promise(() => undefined); },
    async checkRateLimitStore() {}
  }, 5);

  assert.equal(health.status, 'degraded');
  assert.equal(health.checks.database, 'error');
});
