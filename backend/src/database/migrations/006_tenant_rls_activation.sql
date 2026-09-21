-- Activa Row-Level Security sobre las tablas de tenant. Las políticas ya
-- fueron instaladas por 005_organizations_and_tenant_isolation.sql; esta
-- migración solo activa el interruptor.
--
-- IMPORTANTE: esto es inofensivo mientras la app siga conectándose a
-- Postgres con un rol que sea dueño ("owner") de las tablas — Postgres deja
-- pasar libremente al dueño de una tabla, ignore RLS o no. Hoy (confirmado
-- contra producción) la app se conecta como neondb_owner, que es dueño de
-- las 16 tablas de tenant. RLS no protege realmente nada hasta que la app
-- se conecte con un rol de aplicación restringido y no-dueño (ver
-- scripts/provision-app-role.sql) y las transacciones seteen
-- app.organization_id (ver backend/src/tenancy/organizationTransaction.ts).
--
-- La app debe correr cada transacción de tenant así:
--   BEGIN;
--   SET LOCAL app.organization_id = '00000000-0000-0000-0000-000000000000';
--   ... queries de tenant ...
--   COMMIT;

ALTER TABLE site_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE arco_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE international_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE whistleblower_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ropa_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE implementation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;
