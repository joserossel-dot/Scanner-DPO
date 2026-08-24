import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const migrationPath = path.join(
  process.cwd(),
  'src',
  'database',
  'migrations',
  '005_organizations_and_tenant_isolation.sql'
);

test('organizational migration defines the tenancy and RBAC foundation', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  for (const table of [
    'organizations',
    'organization_memberships',
    'roles',
    'permissions',
    'role_permissions',
    'membership_roles'
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
  }

  assert.match(sql, /ADD COLUMN IF NOT EXISTS organization_id UUID/);
  assert.match(sql, /current_setting\(''app\.organization_id'', true\)/);
  assert.doesNotMatch(sql, /ENABLE ROW LEVEL SECURITY/);
});

test('migration is additive and seeds data idempotently', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /ON CONFLICT \(slug\) DO NOTHING/);
  assert.match(sql, /ON CONFLICT \(organization_id, user_id\) DO NOTHING/);
  assert.match(sql, /ON CONFLICT DO NOTHING/);
  assert.match(sql, /HAVING COUNT\(DISTINCT organization_id\) = 1/);
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE TABLE|DELETE FROM/i);
});
