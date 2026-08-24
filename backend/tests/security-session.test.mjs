import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

process.env.JWT_SECRET ||= 'test-only-secret-with-at-least-32-characters';
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_STORE = 'memory';

const { deriveSessionVersion, sessionVersionsMatch } = await import('../dist/security/sessionVersion.js');
const { getRateLimitBackend } = await import('../dist/security/rateLimitStore.js');

test('session version is stable for the same credential state', () => {
  const first = deriveSessionVersion('42', 'hash-one', process.env.JWT_SECRET);
  assert.equal(first, deriveSessionVersion('42', 'hash-one', process.env.JWT_SECRET));
  assert.equal(sessionVersionsMatch(first, first), true);
});

test('password changes and different users invalidate the session version', () => {
  const original = deriveSessionVersion('42', 'hash-one', process.env.JWT_SECRET);
  assert.equal(sessionVersionsMatch(original, deriveSessionVersion('42', 'hash-two', process.env.JWT_SECRET)), false);
  assert.equal(sessionVersionsMatch(original, deriveSessionVersion('43', 'hash-one', process.env.JWT_SECRET)), false);
  assert.equal(sessionVersionsMatch(undefined, original), false);
});

test('test environment explicitly uses process-local rate limiting', () => {
  assert.equal(getRateLimitBackend(), 'memory');
});

test('production refuses to create a limiter without shared Redis configuration', () => {
  const script = "import('./dist/security/rateLimitStore.js').then(m => m.createRateLimitStore('test'))";
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, NODE_ENV: 'production', RATE_LIMIT_STORE: '', REDIS_URL: '' },
    encoding: 'utf8'
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /REDIS_URL is required/);
});
