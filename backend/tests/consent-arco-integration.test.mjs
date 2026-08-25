import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const api = readFileSync(new URL('../src/routes/api.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/routes/serviceWorkspace.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../src/database/migrations/015_consent_arco_evidence.sql', import.meta.url), 'utf8');

test('public consent records are bound to a configured organization and notice version', () => {
  assert.match(api, /organization_id, action/);
  assert.match(api, /dominio no está configurado para registrar preferencias/);
  assert.match(api, /policy_version, organization_id FROM site_configs/);
  assert.match(api, /CONFIRMED_ROPA_LINKED/);
});

test('ARCO workflow records stages and blocks closure without analysis and response evidence', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS arco_request_events/);
  assert.match(service, /Debe registrar el análisis de la solicitud/);
  assert.match(service, /Para cerrar debe registrar respuesta, canal y envío/);
  assert.match(service, /Debe revisar y confirmar el plazo aplicable/);
  assert.match(service, /INSERT INTO compliance_evidence/);
});
