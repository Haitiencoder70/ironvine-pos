import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});
