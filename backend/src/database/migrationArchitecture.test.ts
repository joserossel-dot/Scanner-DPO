import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

test('startup delegates all schema changes to the migration runner', async () => {
  const source = await readFile(path.resolve(process.cwd(), 'src/database/db.ts'), 'utf8');
  assert.match(source, /runMigrations\(pool\)/);
  assert.doesNotMatch(source, /CREATE\s+TABLE|ALTER\s+TABLE|INSERT\s+INTO|UPDATE\s+/i);
});

test('baseline migration is additive and defines migration 005 dependencies', async () => {
  const sql = await readFile(path.resolve(process.cwd(), 'src/database/migrations/001_legacy_baseline.sql'), 'utf8');
  for (const table of ['users', 'site_configs', 'audit_reports', 'arco_requests', 'ropa_inventory', 'documents']) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, 'i'));
  }
  assert.doesNotMatch(sql, /^\s*(?:DROP|TRUNCATE|DELETE)\b/im);
});
