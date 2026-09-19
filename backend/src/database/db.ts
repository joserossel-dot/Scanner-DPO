import pg from 'pg';
import dotenv from 'dotenv';
import { runMigrations } from './migrationRunner.js';
import { databaseSslConfig } from './sslConfig.js';

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error('DATABASE_URL environment variable is missing.');

// 1. Conexión para migraciones (initDb). Usa DATABASE_URL (el rol owner).
const pool = new Pool({ connectionString, ssl: databaseSslConfig(connectionString) });

// 2. Conexión para queries en runtime (getDb). Usa APP_DATABASE_URL si está
// definida (el rol scanner_app, sin privilegios de owner), con fallback a
// DATABASE_URL si no está definida (para no romper desarrollo local ni
// entornos donde todavía no se haya provisionado el rol restringido).
// Esto es lo que hace que RLS proteja de verdad: Postgres deja pasar
// libremente al dueño de una tabla sin importar las políticas.
const appConnectionString = process.env.APP_DATABASE_URL || connectionString;
const appPool = new Pool({
  connectionString: appConnectionString,
  ssl: databaseSslConfig(appConnectionString)
});

export async function initDb() {
  const client = await pool.connect();
  client.release();

  const appliedMigrations = await runMigrations(pool);
  if (appliedMigrations.length > 0) {
    console.log(`Migraciones aplicadas: ${appliedMigrations.map(({ version }) => version).join(', ')}`);
  }
  console.log('Esquema PostgreSQL validado mediante migraciones versionadas.');
  return appPool;
}

export function getDb() {
  return appPool;
}
