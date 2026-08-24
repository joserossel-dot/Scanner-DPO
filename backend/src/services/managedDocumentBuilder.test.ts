import assert from 'node:assert/strict';
import test from 'node:test';
import { buildManagedDocument, documentTitle } from './managedDocumentBuilder.js';

const context = {
  companyName: 'Empresa <Prueba>',
  taxIdentifier: '76.000.000-0',
  contactName: 'Responsable',
  contactEmail: 'privacidad@example.invalid',
  processes: [{ process_name: 'Clientes', data_categories: ['Contacto'], retention_period: '2 años', deletion_method: 'Borrado seguro' }]
};

test('builds every managed document as a reviewable HTML draft', () => {
  for (const type of ['EMPLOYEE_ANNEX', 'RETENTION_POLICY', 'ARCO_PROCEDURE', 'INCIDENT_PLAYBOOK'] as const) {
    const html = buildManagedDocument(type, context);
    assert.match(html, new RegExp(documentTitle(type)));
    assert.match(html, /Borrador sujeto a revisión profesional/);
    assert.doesNotMatch(html, /Empresa <Prueba>/);
    assert.match(html, /Empresa &lt;Prueba&gt;/);
  }
});

test('retention policy is driven by confirmed process data', () => {
  const html = buildManagedDocument('RETENTION_POLICY', context);
  assert.match(html, /Clientes/);
  assert.match(html, /Borrado seguro/);
});
