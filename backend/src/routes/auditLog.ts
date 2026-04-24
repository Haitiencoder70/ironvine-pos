import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';

export const auditLogRouter = Router();

auditLogRouter.get('/', authorize('settings:view'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const organizationId = req.organizationDbId;
    if (!organizationId) {
      res.status(400).json({ error: 'Missing organization context' });
      return;
    }

    const rawLimit = parseInt((req.query['limit'] as string) ?? '50', 10);
    const rawPage  = parseInt((req.query['page']  as string) ?? '1',  10);
    const limit    = Math.min(Math.max(rawLimit, 1), 200);
    const page     = Math.max(rawPage, 1);
    const skip     = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where: { organizationId } }),
    ]);

    res.json({ data, total, page, limit });
  } catch (error) {
    next(error);
  }
});
