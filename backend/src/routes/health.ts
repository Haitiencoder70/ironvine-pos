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
    checks['redis'] = 'unavailable';
  }

  // Always return 200 so the frontend doesn't show the "offline" banner.
  // A degraded database will be surfaced in the response body for diagnostics.
  res.status(200).json(checks);
});
