import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool, PoolClient } from 'pg';

const MIGRATION_LOCK_ID = 21719;

export interface AppliedMigration {
  version: string;
  appliedAt: Date;
}

async function migrationsDirectory(): Promise<string> {
  const compiledOrSource = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
  try {
    await fs.access(compiledOrSource);
    return compiledOrSource;
  } catch {
    // TypeScript does not copy SQL assets to dist. Production packages that keep
    // src alongside dist can still resolve the canonical migration directory.
    const source = path.join(process.cwd(), 'src', 'database', 'migrations');
    await fs.access(source);
    return source;
  }
}

async function migrationFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^\d{3}_[a-z0-9_]+\.sql$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function runMigrations(pool: Pool): Promise<AppliedMigration[]> {
  const client = await pool.connect();
  const applied: AppliedMigration[] = [];

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await ensureMigrationTable(client);

    const directory = await migrationsDirectory();
    for (const filename of await migrationFiles(directory)) {
      const exists = await client.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [filename]
      );
      if (exists.rowCount) continue;

      const sql = await fs.readFile(path.join(directory, filename), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        const result = await client.query<{ applied_at: Date }>(
          `INSERT INTO schema_migrations (version)
           VALUES ($1)
           RETURNING applied_at`,
          [filename]
        );
        await client.query('COMMIT');
        applied.push({ version: filename, appliedAt: result.rows[0].applied_at });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    } finally {
      client.release();
    }
  }

  return applied;
}
