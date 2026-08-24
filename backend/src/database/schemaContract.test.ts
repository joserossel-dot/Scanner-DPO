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

test('repair migration is idempotent and grants ownership only to organization creators', async () => {
  const repairPath = path.join(
    process.cwd(),
    'src',
    'database',
    'migrations',
    '007_repair_user_organization_ownership.sql'
  );
  const sql = await readFile(repairPath, 'utf8');

  assert.match(sql, /'repair-' \|\| u\.id::text/);
  assert.match(sql, /ON CONFLICT \(slug\) DO NOTHING/);
  assert.match(sql, /ON CONFLICT \(organization_id, user_id\) DO NOTHING/);
  assert.match(sql, /o\.created_by = om\.user_id/);
  assert.match(sql, /om\.status = 'active'/);
  assert.doesNotMatch(sql, /UPDATE organization_memberships[\s\S]*status/i);
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE TABLE|DELETE FROM/i);
});

test('managed-service migration defines the P0 workspace without destructive operations', async () => {
  const managedServicePath = path.join(
    process.cwd(),
    'src',
    'database',
    'migrations',
    '008_managed_service_workspace.sql'
  );
  const sql = await readFile(managedServicePath, 'utf8');

  for (const table of [
    'service_engagements',
    'eligibility_assessments',
    'organization_contacts',
    'compliance_tasks',
    'compliance_evidence',
    'compliance_reviews',
    'periodic_reviews'
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
  }

  assert.match(sql, /activity_code INTEGER CHECK \(activity_code BETWEEN 1 AND 17\)/);
  assert.match(sql, /'service\.manage'/);
  assert.match(sql, /'arco\.operate'/);
  assert.doesNotMatch(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE TABLE|DELETE FROM/i);
});
