-- scripts/provision-app-role.sql
--
-- Ejecutar en PostgreSQL (Neon) conectado como dueño (ej. neondb_owner).
-- Crea el rol de aplicación "scanner_app": sin privilegios de owner, para
-- que Row-Level Security (activada en la migración 006) proteja de verdad.
--
-- Uso:
--   SCANNER_APP_PASSWORD='una-contraseña-fuerte-generada-aparte' \
--     psql "$DATABASE_URL" -f scripts/provision-app-role.sql
--
-- NOTA IMPORTANTE: la primera versión de este script otorgaba permisos
-- listando 16 tablas "de tenant" a mano. Eso era incorrecto — el esquema
-- real tiene 44 tablas, incluyendo las de identidad y roles (users,
-- organizations, organization_memberships, roles, permissions,
-- role_permissions, membership_roles) que la app consulta constantemente
-- fuera de las migraciones (login, registro, resolución de organización
-- activa). Con la lista corta, activar APP_DATABASE_URL habría roto la
-- aplicación completa con errores "permission denied for table users".
-- Este script usa GRANT sobre TODAS las tablas actuales, más
-- ALTER DEFAULT PRIVILEGES para que las tablas que agreguen migraciones
-- futuras (007 en adelante) queden accesibles automáticamente, sin tener
-- que acordarse de correr este script de nuevo cada vez.
\set app_password `echo "$SCANNER_APP_PASSWORD"`

-- DROP + CREATE (en vez de un bloque condicional) porque la sustitución de
-- variables de psql (:'app_password') no funciona dentro de un bloque
-- DO $$ ... $$ — ese contenido se trata como texto literal para el motor SQL,
-- no como entrada a preprocesar por psql. Recrear el rol es seguro: no posee
-- ningún objeto (todo pertenece a neondb_owner), así que no hay nada que
-- reasignar ni perder al recrearlo.
DROP ROLE IF EXISTS scanner_app;
CREATE ROLE scanner_app WITH LOGIN PASSWORD :'app_password';

GRANT USAGE ON SCHEMA public TO scanner_app;

-- Privilegios DML sobre todas las tablas que existen hoy.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO scanner_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO scanner_app;

-- schema_migrations es responsabilidad exclusiva del runner de migraciones,
-- que siempre corre con el rol dueño (DATABASE_URL). La app en tiempo de
-- ejecución (APP_DATABASE_URL / scanner_app) nunca debe poder leerla ni
-- modificarla.
REVOKE ALL ON schema_migrations FROM scanner_app;

-- Para que las tablas de migraciones FUTURAS (007+) queden accesibles sin
-- tener que volver a correr este script manualmente cada vez.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO scanner_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO scanner_app;
