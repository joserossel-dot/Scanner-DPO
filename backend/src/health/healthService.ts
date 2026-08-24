export type DependencyStatus = 'ok' | 'error';

export interface HealthSnapshot {
  status: 'ok' | 'degraded';
  checks: {
    process: 'ok';
    database: DependencyStatus;
    rateLimitStore: DependencyStatus;
  };
}

export interface HealthDependencies {
  checkDatabase(): Promise<void>;
  checkRateLimitStore(): Promise<void>;
}

async function settlesWithin(check: () => Promise<void>, timeoutMs: number): Promise<DependencyStatus> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      check(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('health check timeout')), timeoutMs);
      })
    ]);
    return 'ok';
  } catch {
    return 'error';
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function collectHealth(
  dependencies: HealthDependencies,
  timeoutMs = 1500
): Promise<HealthSnapshot> {
  const [database, rateLimitStore] = await Promise.all([
    settlesWithin(dependencies.checkDatabase, timeoutMs),
    settlesWithin(dependencies.checkRateLimitStore, timeoutMs)
  ]);

  return {
    status: database === 'ok' && rateLimitStore === 'ok' ? 'ok' : 'degraded',
    checks: { process: 'ok', database, rateLimitStore }
  };
}
