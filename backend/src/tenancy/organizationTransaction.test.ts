import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool, PoolClient } from 'pg';
import { withOrganizationTransaction } from './organizationTransaction.js';

const organizationId = '00000000-0000-4000-8000-000000000001';

test('tenant transaction sets local context before application queries', async () => {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const client = fakeClient(calls);
  const result = await withOrganizationTransaction(fakePool(client), organizationId, async (tx) => {
    await tx.query('SELECT * FROM ropa_inventory');
    return 'done';
  });
  assert.equal(result, 'done');
  assert.deepEqual(calls.map(({ sql }) => sql), ['BEGIN', "SELECT set_config('app.organization_id', $1, true)", 'SELECT * FROM ropa_inventory', 'COMMIT']);
  assert.deepEqual(calls[1].values, [organizationId]);
});

test('tenant transaction rolls back and releases on failure', async () => {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const client = fakeClient(calls);
  await assert.rejects(withOrganizationTransaction(fakePool(client), organizationId, async () => { throw new Error('query failed'); }), /query failed/);
  assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
  assert.equal((client as unknown as { released: boolean }).released, true);
});

test('malformed organization identifiers are rejected before connecting', async () => {
  let connected = false;
  const pool = { connect: async () => { connected = true; return fakeClient([]); } } as unknown as Pool;
  await assert.rejects(withOrganizationTransaction(pool, 'not-a-uuid', async () => undefined), /Invalid/);
  assert.equal(connected, false);
});

function fakePool(client: PoolClient): Pool { return { connect: async () => client } as unknown as Pool; }
function fakeClient(calls: Array<{ sql: string; values?: unknown[] }>): PoolClient {
  const state = { released: false };
  return { get released() { return state.released; }, query: async (sql: string, values?: unknown[]) => { calls.push({ sql, values }); return { rows: [], rowCount: 0 }; }, release() { state.released = true; } } as unknown as PoolClient;
}
