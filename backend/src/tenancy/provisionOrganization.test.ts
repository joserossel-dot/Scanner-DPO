import assert from 'node:assert/strict';
import test from 'node:test';
import { provisionOrganizationForUser } from './provisionOrganization.js';

test('provisions organization, owner membership, role and default organization', async () => {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const client = {
    async query(text: string, values?: unknown[]) {
      calls.push({ text, values });
      if (text.includes('INSERT INTO organizations')) return { rows: [{ id: 'organization-id' }] };
      if (text.includes('INSERT INTO organization_memberships')) return { rows: [{ id: 'membership-id' }] };
      return { rows: [] };
    }
  };

  const result = await provisionOrganizationForUser(client, 'user-id', 'Empresa QA SpA');

  assert.equal(result, 'organization-id');
  assert.equal(calls.length, 4);
  assert.deepEqual(calls[0].values, ['Empresa QA SpA', 'org-user-id', 'user-id']);
  assert.deepEqual(calls[1].values, ['organization-id', 'user-id']);
  assert.match(calls[2].text, /organization_owner/);
  assert.deepEqual(calls[3].values, ['organization-id', 'user-id']);
});
