import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.resolve(process.cwd(), 'src/database/migrations/012_integrated_data_inventory.sql'), 'utf8');

test('integrated inventory captures the complete processing chain', () => {
  for (const field of [
    'ropa_activity_id', 'organization_unit_id', 'source_system_id', 'destination_system_id',
    'external_party_id', 'data_subject_categories', 'data_categories', 'data_sources',
    'purpose', 'legal_basis', 'destination_countries', 'transfer_mechanism',
    'retention_period', 'deletion_method', 'security_controls', 'process_owner_contact_id',
    'technical_owner_contact_id', 'evidence_status', 'review_status'
  ]) assert.match(migration, new RegExp(`\\b${field}\\b`));
});

test('all tenant-owned inventory tables enable row-level security', () => {
  for (const table of ['organization_units', 'processing_systems', 'external_parties', 'processing_data_flows', 'data_flow_evidence']) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /app\.organization_id/);
});

test('cross-tenant inventory references are rejected by composite foreign keys', () => {
  assert.match(migration, /FOREIGN KEY \(organization_id, ropa_activity_id\)/);
  assert.match(migration, /FOREIGN KEY \(organization_id, source_system_id\)/);
  assert.match(migration, /FOREIGN KEY \(organization_id, external_party_id\)/);
  assert.match(migration, /FOREIGN KEY \(organization_id, evidence_id\)/);
});
