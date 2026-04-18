import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { cacheService } from '../services/cacheService';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const checks: Record<string, string | number> = {
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
    database: 'unknown',
    redis: 'unknown',
    version: process.env['npm_package_version'] ?? '1.0.0',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks['database'] = 'healthy';
  } catch {
    checks['database'] = 'unhealthy';
  }

  try {
    const testKey = '_health_ping';
    await cacheService.set(testKey, 'pong', 5);
    const pong = await cacheService.get<string>(testKey);
    checks['redis'] = pong === 'pong' ? 'healthy' : 'degraded';
  } catch {
    checks['redis'] = 'unhealthy';
  }

  const isHealthy = checks['database'] === 'healthy';
  res.status(isHealthy ? 200 : 503).json(checks);
});
