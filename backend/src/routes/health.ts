import { Router } from 'express';
import { getDb } from '../database/db.js';
import { collectHealth } from '../health/healthService.js';
import { checkRateLimitStore } from '../security/rateLimitStore.js';

const router = Router();

router.get('/', async (_req, res) => {
  const health = await collectHealth({
    async checkDatabase() {
      await getDb().query('SELECT 1');
    },
    checkRateLimitStore
  });

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

export default router;
