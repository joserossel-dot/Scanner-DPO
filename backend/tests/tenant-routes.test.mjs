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

test('managed documents require tenant permissions and professional review', async () => {
  const source = await readFile(routePath('serviceWorkspace'), 'utf8');
  assert.match(source, /documents\/generate', requireOrganizationPermission\('compliance\.write'\)/);
  assert.match(source, /documents\/:id\/review', requireOrganizationPermission\('service\.review'\)/);
  assert.match(source, /workflow_status = \$1/);
  assert.match(source, /INSERT INTO compliance_reviews/);
});

test('RoPA writes the expanded data-flow fields within the active organization', async () => {
  const source = await readFile(routePath('ropa'), 'utf8');
  for (const field of [
    'systems', 'data_sources', 'data_subject_categories', 'recipients', 'deletion_method',
    'contains_sensitive_data', 'legal_basis_rationale', 'retention_legal_basis',
    'security_measures', 'review_due_at', 'automated_decisions'
  ]) {
    assert.match(source, new RegExp(field));
  }
  assert.match(source, /service_engagements WHERE organization_id = \$2/);
});

test('risk, transfer, control and evidence links validate tenant ownership', async () => {
  const dpo = await readFile(routePath('dpoSuite'), 'utf8');
  const transfers = await readFile(routePath('transfers'), 'utf8');
  const service = await readFile(routePath('serviceWorkspace'), 'utf8');
  assert.match(dpo, /ropa_inventory WHERE id = \$1 AND organization_id = \$2/);
  assert.match(dpo, /control_assessments/);
  assert.match(transfers, /ropa_inventory WHERE id = \$1 AND organization_id = \$2/);
  assert.match(service, /El registro asociado no pertenece a la organización/);
});

test('superadmin can assign only defined managed-service roles transactionally', async () => {
  const source = await readFile(routePath('admin'), 'utf8');
  assert.match(source, /service_consultant', 'legal_reviewer', 'arco_operator/);
  assert.match(source, /INSERT INTO organization_memberships/);
  assert.match(source, /INSERT INTO membership_roles/);
  assert.match(source, /client\.query\('BEGIN'\)/);
  assert.match(source, /client\.query\('ROLLBACK'\)/);
});

test('registration provisions a complete organization owner transactionally', async () => {
  const source = await readFile(routePath('auth'), 'utf8');
  assert.match(source, /client\.query\('BEGIN'\)/);
  assert.match(source, /provisionOrganizationForUser\(client/);
  assert.match(source, /client\.query\('COMMIT'\)/);
  assert.match(source, /client\.query\('ROLLBACK'\)/);
  assert.match(source, /client\.release\(\)/);
});
