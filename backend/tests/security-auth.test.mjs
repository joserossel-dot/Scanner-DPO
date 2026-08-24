import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-with-at-least-32-characters';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/scanner_dpo_test';
process.env.DATABASE_SSL_MODE = process.env.DATABASE_SSL_MODE || 'disable';
const { normalizeEmail, validatePassword } = await import('../dist/routes/auth.js');

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
