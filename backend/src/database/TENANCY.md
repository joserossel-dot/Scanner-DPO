# Organizational tenancy and RLS rollout

Migration `005` creates organizations, memberships, granular roles and
permissions. It creates one deterministic organization for every existing user,
assigns that user the `organization_owner` role, and backfills tenant entities
that already have an unambiguous `user_id` or UUID `client_id` owner.

`organization_id` remains nullable during the compatibility window. Rows keyed
only by `domain` or string `client_id`, and legacy rows without an owner, require
an explicit mapping before the columns can become `NOT NULL`.

## Activating RLS

Migration `005` installs policies but deliberately does not enable them. Existing
routes currently filter by `user_id` and do not set PostgreSQL tenant context.
Enabling RLS before those routes are migrated would make their tenant queries
return no rows.

After every tenant route uses a transaction and executes this statement first:

```sql
SET LOCAL app.organization_id = '<authenticated organization UUID>';
```

review and execute `006_tenant_rls_activation.sql.example`. Use a dedicated,
non-owner application database role; retain a separate owner role for migrations.
Do not accept `organization_id` from an unauthenticated request. Resolve it from
the authenticated user's active membership.

## Reproducible PostgreSQL validation

Run `scripts/test-tenant-migration.sh`. It creates a temporary PostgreSQL
cluster, runs the complete application initialization against an empty database,
then builds a separate minimal legacy schema and loads representative rows. It
verifies migration-runner recording, deterministic backfill, ambiguous domain
handling, direct SQL idempotence, and cross-organization isolation under the
example RLS activation with a non-owner role.

The cluster is stopped and removed on exit. The script never reads
`DATABASE_URL` and never connects to an existing database. It uses port 55432
by default; override it with `SCANNER_DPO_TEST_PG_PORT` if necessary.

## TLS

TLS certificate verification is enabled by default. Set `DATABASE_CA_CERT` to a
PEM CA bundle when the database provider requires a private CA. Plaintext can be
requested with `DATABASE_SSL_MODE=disable` only outside production, for a local
database. Production rejects that setting.
