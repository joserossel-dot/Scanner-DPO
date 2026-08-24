import type { Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';

type RateLimitBackend = 'memory' | 'redis';

function configuredBackend(): RateLimitBackend {
  const configured = process.env.RATE_LIMIT_STORE?.trim().toLowerCase();
  if (configured === 'memory' || configured === 'redis') return configured;
  return process.env.NODE_ENV === 'production' ? 'redis' : 'memory';
}

let redisClient: ReturnType<typeof createClient> | undefined;

export function createRateLimitStore(prefix: string): Store | undefined {
  const backend = configuredBackend();
  if (backend === 'memory') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RATE_LIMIT_STORE=memory is not permitted in production; configure Redis.');
    }
    return undefined;
  }
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) throw new Error('REDIS_URL is required for the shared production rate-limit store.');
  if (!redisClient) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', error => console.error('Rate-limit Redis error:', error.message));
    void redisClient.connect().catch(error => {
      console.error('FATAL ERROR: unable to connect to the shared rate-limit store:', error.message);
      if (process.env.NODE_ENV === 'production') process.exit(1);
    });
  }
  return new RedisStore({
    prefix: `scanner-dpo:${prefix}:`,
    sendCommand: (...args: string[]) => redisClient!.sendCommand(args)
  });
}

export function getRateLimitBackend(): RateLimitBackend {
  return configuredBackend();
}
