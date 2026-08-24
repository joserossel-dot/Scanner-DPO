import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routePath = (name) => new URL(`../src/routes/${name}.ts`, import.meta.url);

test('private compliance routers resolve an active organization', async () => {
  for (const name of ['ropa', 'transfers', 'incidents', 'reports', 'remediation', 'dpoSuite', 'ai', 'serviceWorkspace']) {
    const source = await readFile(routePath(name), 'utf8');
    assert.match(source, /router\.use\(authenticateToken\);/);
    assert.match(source, /router\.use\(resolveActiveOrganization\);/);
    assert.match(source, /requireOrganizationPermission\('/);
    assert.doesNotMatch(source, /import cors from 'cors'/);
    assert.doesNotMatch(source, /adminCors/);
  }
});
test('tenant-owned CRUD routes filter and write organization_id', async () => {
  for (const name of ['ropa', 'transfers', 'incidents', 'reports', 'remediation', 'dpoSuite', 'serviceWorkspace']) {
    const source = await readFile(routePath(name), 'utf8');
    assert.match(source, /organization_id/);
    assert.match(source, /req\.organization\.id/);
  }
});

test('public ARCO intake resolves organization ownership and creates an operational task', async () => {
  const source = await readFile(routePath('api'), 'utf8');
  assert.match(source, /INSERT INTO arco_requests[\s\S]*organization_id, engagement_id/);
  assert.match(source, /FROM site_configs sc[\s\S]*WHERE sc\.domain = \$1/);
  assert.match(source, /INSERT INTO compliance_tasks[\s\S]*activity_code/);
});

test('registration provisions a complete organization owner transactionally', async () => {
  const source = await readFile(routePath('auth'), 'utf8');
  assert.match(source, /client\.query\('BEGIN'\)/);
  assert.match(source, /provisionOrganizationForUser\(client/);
  assert.match(source, /client\.query\('COMMIT'\)/);
  assert.match(source, /client\.query\('ROLLBACK'\)/);
  assert.match(source, /client\.release\(\)/);
});
