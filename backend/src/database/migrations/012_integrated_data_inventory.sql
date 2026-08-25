-- Canonical, tenant-scoped data-flow inventory. RoPA remains the processing
-- activity header; these entities normalize the operational facts behind it.

-- Composite keys let every relationship enforce that both records belong to
-- the same tenant, including imports and administrative SQL paths.
ALTER TABLE organization_contacts ADD CONSTRAINT uq_organization_contacts_tenant_id UNIQUE (organization_id, id);
ALTER TABLE ropa_inventory ADD CONSTRAINT uq_ropa_inventory_tenant_id UNIQUE (organization_id, id);
ALTER TABLE compliance_evidence ADD CONSTRAINT uq_compliance_evidence_tenant_id UNIQUE (organization_id, id);

CREATE TABLE IF NOT EXISTS organization_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_unit_id UUID,
  owner_contact_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, name),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, parent_unit_id) REFERENCES organization_units(organization_id, id) ON DELETE SET NULL (parent_unit_id),
  FOREIGN KEY (organization_id, owner_contact_id) REFERENCES organization_contacts(organization_id, id) ON DELETE SET NULL (owner_contact_id)
);

CREATE TABLE IF NOT EXISTS processing_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  system_type VARCHAR(60) NOT NULL DEFAULT 'OTHER',
  owner_contact_id UUID,
  provider_name VARCHAR(255),
  hosting_countries JSONB NOT NULL DEFAULT '[]'::jsonb,
  security_controls JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PLANNED', 'RETIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, name),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, owner_contact_id) REFERENCES organization_contacts(organization_id, id) ON DELETE SET NULL (owner_contact_id)
);

CREATE TABLE IF NOT EXISTS external_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_name VARCHAR(255) NOT NULL,
  tax_identifier VARCHAR(100),
  party_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  countries JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_name VARCHAR(255),
  contact_email VARCHAR(320),
  contract_reference TEXT,
  data_processing_terms_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (data_processing_terms_status IN ('PENDING_REVIEW', 'NOT_REQUIRED', 'MISSING', 'IN_REVIEW', 'SIGNED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, legal_name),
  UNIQUE (organization_id, id)
);

CREATE TABLE IF NOT EXISTS processing_data_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ropa_activity_id UUID NOT NULL,
  organization_unit_id UUID,
  source_system_id UUID,
  destination_system_id UUID,
  external_party_id UUID,
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('COLLECTION', 'INTERNAL', 'DISCLOSURE', 'RETURN', 'DELETION')),
  data_subject_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  purpose TEXT NOT NULL,
  legal_basis VARCHAR(120) NOT NULL,
  legal_basis_rationale TEXT,
  recipient_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  destination_countries JSONB NOT NULL DEFAULT '[]'::jsonb,
  transfer_mechanism VARCHAR(80),
  transfer_safeguards JSONB NOT NULL DEFAULT '[]'::jsonb,
  retention_period TEXT NOT NULL,
  retention_trigger TEXT,
  deletion_method TEXT NOT NULL,
  security_controls JSONB NOT NULL DEFAULT '[]'::jsonb,
  process_owner_contact_id UUID,
  technical_owner_contact_id UUID,
  evidence_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (evidence_status IN ('PENDING', 'PARTIAL', 'VERIFIED')),
  review_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (review_status IN ('DRAFT', 'IN_REVIEW', 'CONFIRMED', 'ARCHIVED')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  next_review_date DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, ropa_activity_id) REFERENCES ropa_inventory(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, organization_unit_id) REFERENCES organization_units(organization_id, id) ON DELETE SET NULL (organization_unit_id),
  FOREIGN KEY (organization_id, source_system_id) REFERENCES processing_systems(organization_id, id) ON DELETE SET NULL (source_system_id),
  FOREIGN KEY (organization_id, destination_system_id) REFERENCES processing_systems(organization_id, id) ON DELETE SET NULL (destination_system_id),
  FOREIGN KEY (organization_id, external_party_id) REFERENCES external_parties(organization_id, id) ON DELETE SET NULL (external_party_id),
  FOREIGN KEY (organization_id, process_owner_contact_id) REFERENCES organization_contacts(organization_id, id) ON DELETE SET NULL (process_owner_contact_id),
  FOREIGN KEY (organization_id, technical_owner_contact_id) REFERENCES organization_contacts(organization_id, id) ON DELETE SET NULL (technical_owner_contact_id)
);

CREATE TABLE IF NOT EXISTS data_flow_evidence (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL,
  evidence_id UUID NOT NULL,
  relevance_notes TEXT,
  PRIMARY KEY (flow_id, evidence_id),
  FOREIGN KEY (organization_id, flow_id) REFERENCES processing_data_flows(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, evidence_id) REFERENCES compliance_evidence(organization_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_units_org ON organization_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_systems_org ON processing_systems(organization_id);
CREATE INDEX IF NOT EXISTS idx_parties_org ON external_parties(organization_id);
CREATE INDEX IF NOT EXISTS idx_flows_org_activity ON processing_data_flows(organization_id, ropa_activity_id);
CREATE INDEX IF NOT EXISTS idx_flows_review ON processing_data_flows(organization_id, review_status, next_review_date);

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['organization_units', 'processing_systems', 'external_parties', 'processing_data_flows', 'data_flow_evidence']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::uuid) WITH CHECK (organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;
