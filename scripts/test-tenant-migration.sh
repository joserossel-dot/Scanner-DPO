#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
migration="$repo_dir/backend/src/database/migrations/005_organizations_and_tenant_isolation.sql"
activation="$repo_dir/backend/src/database/migrations/006_tenant_rls_activation.sql.example"
cluster_dir="$(mktemp -d "${TMPDIR:-/tmp}/scanner-dpo-pg.XXXXXX")"
port="${SCANNER_DPO_TEST_PG_PORT:-55432}"

# Debian and Ubuntu install versioned PostgreSQL binaries outside the default
# PATH used by GitHub Actions. pg_config provides the active installation path.
if ! command -v pg_config >/dev/null 2>&1; then
  echo "ERROR: pg_config not found; install the PostgreSQL server development runtime." >&2
  exit 1
fi
postgres_bin="$(pg_config --bindir)"
for postgres_command in initdb pg_ctl createdb psql; do
  if [[ ! -x "$postgres_bin/$postgres_command" ]]; then
    echo "ERROR: PostgreSQL command not found: $postgres_bin/$postgres_command" >&2
    exit 1
  fi
done
export PATH="$postgres_bin:$PATH"

cleanup() {
  pg_ctl -D "$cluster_dir" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$cluster_dir"
}
trap cleanup EXIT

initdb -D "$cluster_dir" --auth=trust --no-locale --encoding=UTF8 >/dev/null
if ! pg_ctl -D "$cluster_dir" -l "$cluster_dir/postgres.log" \
  -o "-h 127.0.0.1 -p $port -k $cluster_dir" -w start >/dev/null; then
  cat "$cluster_dir/postgres.log" >&2
  exit 1
fi
createdb -h 127.0.0.1 -p "$port" scanner_dpo_migration_test
psql_cmd=(psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$port" -d scanner_dpo_migration_test)

# Exercise the application's complete initialization path against a genuinely
# empty database before testing a populated legacy contract separately.
createdb -h 127.0.0.1 -p "$port" scanner_dpo_empty_test
(
  cd "$repo_dir/backend"
  DATABASE_URL="postgresql://127.0.0.1:$port/scanner_dpo_empty_test" \
  DATABASE_SSL_MODE=disable NODE_ENV=test \
    npx --no-install tsx -e \
      "import('./src/database/db.ts').then(async ({ initDb }) => { await initDb(); process.exit(0); }).catch((error) => { console.error(error); process.exit(1); })"
)
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$port" -d scanner_dpo_empty_test <<'SQL'
DO $$ BEGIN
 IF to_regclass('public.organizations') IS NULL THEN RAISE EXCEPTION 'empty initialization did not apply migration 005'; END IF;
 IF (SELECT count(*) FROM schema_migrations WHERE version = '005_organizations_and_tenant_isolation.sql') <> 1 THEN RAISE EXCEPTION 'migration runner did not record migration 005'; END IF;
END $$;
SQL

# Minimal schema produced by legacy initialization before migration 005.
"${psql_cmd[@]}" <<'SQL'
CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL, company_name TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE site_configs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id), domain TEXT NOT NULL);
CREATE TABLE audit_reports (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id));
CREATE TABLE consent_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id), domain TEXT);
CREATE TABLE arco_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id), domain TEXT);
CREATE TABLE international_transfers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id), domain TEXT);
CREATE TABLE security_incidents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id), domain TEXT);
CREATE TABLE privacy_policies (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id));
CREATE TABLE risk_matrix (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id));
CREATE TABLE whistleblower_reports (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id));
CREATE TABLE ropa_inventory (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id));
CREATE TABLE document_downloads (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id));
CREATE TABLE implementation_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id));
CREATE TABLE documents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID REFERENCES users(id));
CREATE TABLE form_consent_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT);
CREATE TABLE employee_trainings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT);
CREATE TABLE training_materials (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT);
INSERT INTO users (id, email, company_name) VALUES
 ('00000000-0000-0000-0000-000000000001', 'one@example.test', 'One'),
 ('00000000-0000-0000-0000-000000000002', 'two@example.test', 'Two');
INSERT INTO site_configs (user_id, domain) VALUES
 ('00000000-0000-0000-0000-000000000001', 'one.example'),
 ('00000000-0000-0000-0000-000000000001', 'shared.example'),
 ('00000000-0000-0000-0000-000000000002', 'shared.example');
INSERT INTO audit_reports (user_id) VALUES ('00000000-0000-0000-0000-000000000001');
INSERT INTO documents (client_id) VALUES ('00000000-0000-0000-0000-000000000002');
INSERT INTO form_consent_logs (client_id) VALUES ('00000000-0000-0000-0000-000000000001');
INSERT INTO consent_logs (domain) VALUES ('one.example'), ('shared.example'), ('unknown.example');
SQL

"${psql_cmd[@]}" -f "$migration" >/dev/null
"${psql_cmd[@]}" -f "$migration" >/dev/null

"${psql_cmd[@]}" <<'SQL'
DO $$
DECLARE org_one UUID; org_two UUID;
BEGIN
 SELECT default_organization_id INTO org_one FROM users WHERE email = 'one@example.test';
 SELECT default_organization_id INTO org_two FROM users WHERE email = 'two@example.test';
 IF org_one IS NULL OR org_two IS NULL OR org_one = org_two THEN RAISE EXCEPTION 'organization backfill failed'; END IF;
 IF (SELECT count(*) FROM organization_memberships) <> 2 THEN RAISE EXCEPTION 'membership idempotence failed'; END IF;
 IF (SELECT count(*) FROM membership_roles mr JOIN roles r ON r.id = mr.role_id WHERE r.code = 'organization_owner') <> 2 THEN RAISE EXCEPTION 'owner roles failed'; END IF;
 IF (SELECT organization_id FROM audit_reports LIMIT 1) <> org_one THEN RAISE EXCEPTION 'user_id backfill failed'; END IF;
 IF (SELECT organization_id FROM documents LIMIT 1) <> org_two THEN RAISE EXCEPTION 'UUID client_id backfill failed'; END IF;
 IF (SELECT organization_id FROM form_consent_logs LIMIT 1) <> org_one THEN RAISE EXCEPTION 'text client_id backfill failed'; END IF;
 IF (SELECT organization_id FROM consent_logs WHERE domain = 'one.example') <> org_one THEN RAISE EXCEPTION 'domain backfill failed'; END IF;
 IF (SELECT organization_id FROM consent_logs WHERE domain = 'shared.example') IS NOT NULL THEN RAISE EXCEPTION 'ambiguous domain assigned'; END IF;
 IF (SELECT organization_id FROM consent_logs WHERE domain = 'unknown.example') IS NOT NULL THEN RAISE EXCEPTION 'unknown domain assigned'; END IF;
END $$;
CREATE ROLE scanner_app NOLOGIN;
GRANT USAGE ON SCHEMA public TO scanner_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON site_configs TO scanner_app;
SQL

"${psql_cmd[@]}" -f "$activation" >/dev/null
"${psql_cmd[@]}" <<'SQL'
BEGIN;
SELECT set_config('app.organization_id', (SELECT default_organization_id::text FROM users WHERE email = 'one@example.test'), true);
SET LOCAL ROLE scanner_app;
DO $$ BEGIN
 IF (SELECT count(*) FROM site_configs) <> 2 THEN RAISE EXCEPTION 'tenant one row count failed'; END IF;
 IF EXISTS (SELECT 1 FROM site_configs WHERE user_id = '00000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'cross-tenant row visible'; END IF;
END $$;
ROLLBACK;
SQL

echo "PASS: empty initialization, legacy backfill, runner/direct idempotence, ambiguous ownership and RLS isolation"
