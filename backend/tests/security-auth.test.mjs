import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-with-at-least-32-characters';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/scanner_dpo_test';
process.env.DATABASE_SSL_MODE = process.env.DATABASE_SSL_MODE || 'disable';
const { normalizeEmail, validatePassword } = await import('../dist/routes/auth.js');
const { authenticateToken } = await import('../dist/middlewares/auth.js');

test('normalizeEmail canonicalizes valid input and rejects malformed input', () => {
  assert.equal(normalizeEmail(' User@Example.COM '), 'user@example.com');
  assert.equal(normalizeEmail('not-an-email'), null);
  assert.equal(normalizeEmail(123), null);
});

test('password policy enforces length and character classes', () => {
  assert.equal(validatePassword('short1A'), null);
  assert.equal(validatePassword('alllowercase123'), null);
  assert.equal(validatePassword('SecurePassword123'), 'SecurePassword123');
  assert.equal(validatePassword('A'.repeat(129) + 'a1'), null);
});

test('invalid access tokens return 401 instead of an authorization 403', async () => {
  const request = {
    method: 'GET',
    headers: { authorization: 'Bearer invalid-token' }
  };
  let statusCode;
  let payload;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    }
  };

  await authenticateToken(request, response, () => {
    assert.fail('invalid token must not call next');
  });

  assert.equal(statusCode, 401);
  assert.deepEqual(payload, { error: 'Token de acceso inválido o expirado.' });
});
