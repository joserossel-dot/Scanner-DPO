-- Versioned, non-technical discovery questionnaires. Answers preserve unknowns
-- explicitly and are mapped to draft data flows only after user confirmation.

CREATE TABLE IF NOT EXISTS discovery_schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_code VARCHAR(80) NOT NULL,
  version VARCHAR(40) NOT NULL,
  title VARCHAR(255) NOT NULL,
  locale VARCHAR(20) NOT NULL DEFAULT 'es-CL',
  definition JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'RETIRED')),
  effective_from DATE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (schema_code, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_discovery_schema
  ON discovery_schema_versions(schema_code, locale) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS discovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  schema_version_id UUID NOT NULL REFERENCES discovery_schema_versions(id) ON DELETE RESTRICT,
  respondent_contact_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (status IN ('IN_PROGRESS', 'READY_FOR_REVIEW', 'CONFIRMED', 'ARCHIVED')),
  started_by UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, respondent_contact_id)
    REFERENCES organization_contacts(organization_id, id) ON DELETE SET NULL (respondent_contact_id)
);

CREATE TABLE IF NOT EXISTS discovered_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  process_template_code VARCHAR(80) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  unknown_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  completeness_percent SMALLINT NOT NULL DEFAULT 0 CHECK (completeness_percent BETWEEN 0 AND 100),
  review_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (review_status IN ('DRAFT', 'NEEDS_INFORMATION', 'READY_FOR_REVIEW', 'CONFIRMED')),
  mapped_ropa_activity_id UUID,
  mapped_flow_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, session_id) REFERENCES discovery_sessions(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, mapped_ropa_activity_id) REFERENCES ropa_inventory(organization_id, id) ON DELETE SET NULL (mapped_ropa_activity_id),
  FOREIGN KEY (organization_id, mapped_flow_id) REFERENCES processing_data_flows(organization_id, id) ON DELETE SET NULL (mapped_flow_id)
);

CREATE INDEX IF NOT EXISTS idx_discovery_sessions_org ON discovery_sessions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_discovered_processes_session ON discovered_processes(organization_id, session_id);

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['discovery_sessions', 'discovered_processes']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::uuid) WITH CHECK (organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;

INSERT INTO discovery_schema_versions (schema_code, version, title, definition, status, effective_from)
VALUES ('SME_DATA_DISCOVERY', '1.0.0', 'Descubrimiento guiado de tratamientos para pequeñas empresas',
$definition$
{
  "processTemplates": [
    {"code":"CUSTOMERS_SALES","label":"Clientes y ventas","examples":"Cotizaciones, contratos, despacho y postventa"},
    {"code":"BILLING_COLLECTIONS","label":"Facturación y cobranza","examples":"Facturas, pagos, cuentas bancarias y deuda"},
    {"code":"EMPLOYEES_PAYROLL","label":"Trabajadores y remuneraciones","examples":"Contratos, asistencia, licencias y sueldos"},
    {"code":"RECRUITMENT","label":"Postulantes","examples":"CV, entrevistas y referencias"},
    {"code":"SUPPLIERS","label":"Proveedores y compras","examples":"Contactos, contratos y pagos"},
    {"code":"MARKETING","label":"Marketing y comunicaciones","examples":"Campañas, newsletter, redes sociales y perfiles"},
    {"code":"WEBSITE_SUPPORT","label":"Sitio web y atención de consultas","examples":"Formularios, cookies, chat y tickets"},
    {"code":"ACCESS_CCTV","label":"Acceso físico y cámaras","examples":"Registro de visitas, credenciales y CCTV"},
    {"code":"OTHER","label":"Otra actividad","examples":"Cualquier uso de datos no cubierto arriba"}
  ],
  "questions": [
    {"key":"purpose","label":"¿Para qué usa esta información?","type":"text","required":true,"mapsTo":"purpose"},
    {"key":"subjects","label":"¿De qué personas guarda información?","type":"multi","required":true,"mapsTo":"data_subject_categories"},
    {"key":"dataCategories","label":"¿Qué información guarda o consulta?","type":"multi","required":true,"mapsTo":"data_categories"},
    {"key":"sources","label":"¿Cómo obtiene la información?","type":"multi","required":true,"mapsTo":"data_sources"},
    {"key":"legalBasis","label":"¿Qué autoriza o hace necesario este uso?","help":"Puede responder No sé; la base jurídica será revisada.","type":"single","required":true,"mapsTo":"legal_basis"},
    {"key":"sourceSystemId","label":"¿En qué sistema, archivo o lugar se recibe primero?","type":"system_unknown","required":true,"mapsTo":"source_system_id"},
    {"key":"movesBetweenSystems","label":"¿Después pasa a otro sistema o archivo?","type":"boolean_unknown","required":true,"mapsTo":"destination_system_id"},
    {"key":"destinationSystemId","label":"¿A qué sistema, archivo o lugar pasa?","type":"system_unknown","requiredWhen":{"key":"movesBetweenSystems","equals":true},"mapsTo":"destination_system_id"},
    {"key":"sharesData","label":"¿La entrega o permite acceso a otra empresa?","type":"boolean_unknown","required":true,"mapsTo":"external_party_id"},
    {"key":"externalPartyId","label":"¿Qué empresa la recibe o puede acceder?","type":"party_unknown","requiredWhen":{"key":"sharesData","equals":true},"mapsTo":"external_party_id"},
    {"key":"recipients","label":"¿Quién recibe o puede acceder?","type":"multi","requiredWhen":{"key":"sharesData","equals":true},"mapsTo":"recipient_roles,external_party_id"},
    {"key":"countries","label":"¿En qué países se guarda o recibe?","type":"multi","requiredWhen":{"key":"sharesData","equals":true},"mapsTo":"destination_countries"},
    {"key":"internationalTransfer","label":"¿Algún dato se guarda o recibe fuera de Chile?","type":"boolean_unknown","required":true,"mapsTo":"destination_countries,transfer_mechanism"},
    {"key":"transferMechanism","label":"¿Qué respaldo tiene el envío fuera de Chile?","type":"single_unknown","requiredWhen":{"key":"internationalTransfer","equals":true},"mapsTo":"transfer_mechanism,transfer_safeguards"},
    {"key":"retentionPeriod","label":"¿Durante cuánto tiempo la conserva?","type":"text_unknown","required":true,"mapsTo":"retention_period"},
    {"key":"retentionTrigger","label":"¿Desde qué evento cuenta ese plazo?","type":"text_unknown","required":true,"mapsTo":"retention_trigger"},
    {"key":"deletionMethod","label":"¿Cómo la elimina o anonimiza al vencer el plazo?","type":"text_unknown","required":true,"mapsTo":"deletion_method"},
    {"key":"processOwner","label":"¿Quién responde por este proceso?","type":"contact_unknown","required":true,"mapsTo":"process_owner_contact_id"},
    {"key":"technicalOwner","label":"¿Quién administra el sistema?","type":"contact_unknown","required":true,"mapsTo":"technical_owner_contact_id"},
    {"key":"securityControls","label":"¿Cómo protege esta información?","type":"multi_unknown","required":true,"mapsTo":"security_controls"},
    {"key":"sensitiveData","label":"¿Incluye salud, biometría, menores u otra información sensible?","type":"boolean_unknown","required":true,"mapsTo":"ropa.contains_sensitive_data"},
    {"key":"sensitiveCategories","label":"¿Qué información sensible incluye?","type":"multi","requiredWhen":{"key":"sensitiveData","equals":true},"mapsTo":"ropa.sensitive_data_categories"},
    {"key":"automatedDecisions","label":"¿Una decisión importante se toma automáticamente usando estos datos?","type":"boolean_unknown","required":true,"mapsTo":"ropa.automated_decisions"},
    {"key":"automatedDecisionDetails","label":"Describa la decisión automática y sus efectos","type":"text","requiredWhen":{"key":"automatedDecisions","equals":true},"mapsTo":"ropa.automated_decision_details"}
  ],
  "unknownValue":"UNKNOWN"
}
$definition$::jsonb, 'ACTIVE', CURRENT_DATE)
ON CONFLICT (schema_code, version) DO NOTHING;
