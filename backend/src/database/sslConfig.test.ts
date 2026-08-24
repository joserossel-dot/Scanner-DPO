import assert from 'node:assert/strict';
import test from 'node:test';
import { databaseSslConfig } from './sslConfig.js';

const renderUrl = 'postgresql://user:password@dpg-da68vg8n74is739ihpgg-a:5432/database';

test('uses strict certificate verification by default', () => {
  assert.deepEqual(databaseSslConfig(renderUrl, { NODE_ENV: 'production' }), {
    rejectUnauthorized: true
  });
});

test('accepts an explicit CA certificate while retaining strict verification', () => {
  assert.deepEqual(databaseSslConfig(renderUrl, {
    NODE_ENV: 'production',
    DATABASE_CA_CERT: 'test-ca'
  }), { rejectUnauthorized: true, ca: 'test-ca' });
});

test('allows the Render compatibility mode only for internal Render hosts', () => {
  assert.deepEqual(databaseSslConfig(renderUrl, {
    NODE_ENV: 'production',
    DATABASE_SSL_MODE: 'render-internal'
  }), { rejectUnauthorized: false });

  assert.throws(
    () => databaseSslConfig('postgresql://user:password@db.example.com:5432/database', {
      NODE_ENV: 'production',
      DATABASE_SSL_MODE: 'render-internal'
    }),
    /restricted to Render internal PostgreSQL hosts/
  );
});

test('continues to reject fully disabled TLS in production', () => {
  assert.throws(
    () => databaseSslConfig(renderUrl, {
      NODE_ENV: 'production',
      DATABASE_SSL_MODE: 'disable'
    }),
    /not allowed in production/
  );
});
