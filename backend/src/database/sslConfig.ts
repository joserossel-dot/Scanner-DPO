export type DatabaseSslConfig = false | { rejectUnauthorized: boolean; ca?: string };

const RENDER_INTERNAL_POSTGRES_HOST = /^dpg-[a-z0-9-]+-a$/;

export function databaseSslConfig(
  connectionString: string,
  environment: NodeJS.ProcessEnv = process.env
): DatabaseSslConfig {
  const mode = environment.DATABASE_SSL_MODE?.trim().toLowerCase();
  if (mode === 'disable') {
    if (environment.NODE_ENV === 'production') {
      throw new Error('DATABASE_SSL_MODE=disable is not allowed in production.');
    }
    return false;
  }

  if (mode === 'render-internal') {
    const hostname = new URL(connectionString).hostname;
    if (!RENDER_INTERNAL_POSTGRES_HOST.test(hostname)) {
      throw new Error('DATABASE_SSL_MODE=render-internal is restricted to Render internal PostgreSQL hosts.');
    }
    return { rejectUnauthorized: false };
  }

  return {
    rejectUnauthorized: true,
    ...(environment.DATABASE_CA_CERT ? { ca: environment.DATABASE_CA_CERT } : {})
  };
}
