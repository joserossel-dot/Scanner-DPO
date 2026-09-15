import pg from 'pg';
import dotenv from 'dotenv';
import { runMigrations } from './migrationRunner.js';
import { databaseSslConfig } from './sslConfig.js';
dotenv.config();
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString)
    throw new Error('DATABASE_URL environment variable is missing.');
const pool = new Pool({ connectionString, ssl: databaseSslConfig(connectionString) });
export async function initDb() {
    const client = await pool.connect();
    client.release();
    const appliedMigrations = await runMigrations(pool);
    if (appliedMigrations.length > 0) {
        console.log(`Migraciones aplicadas: ${appliedMigrations.map(({ version }) => version).join(', ')}`);
    }
    console.log('Esquema PostgreSQL validado mediante migraciones versionadas.');
    return pool;
}
export function getDb() {
    return pool;
}
