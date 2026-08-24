import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routePath = (name) => new URL(`../src/routes/${name}.ts`, import.meta.url);

test('private compliance routers resolve an active organization', async () => {
  for (const name of ['ropa', 'transfers', 'incidents', 'reports', 'remediation', 'dpoSuite', 'ai']) {
    const source = await readFile(routePath(name), 'utf8');
    assert.match(source, /router\.use\(authenticateToken\);/);
    assert.match(source, /router\.use\(resolveActiveOrganization\);/);
    assert.match(source, /requireOrganizationPermission\('/);
    assert.doesNotMatch(source, /import cors from 'cors'/);
    assert.doesNotMatch(source, /adminCors/);
  }
});
test('tenant-owned CRUD routes filter and write organization_id', async () => {
  for (const name of ['ropa', 'transfers', 'incidents', 'reports', 'remediation', 'dpoSuite']) {
    const source = await readFile(routePath(name), 'utf8');
    assert.match(source, /organization_id/);
    assert.match(source, /req\.organization\.id/);
  }
});
