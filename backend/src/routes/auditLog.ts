import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';

export const auditLogRouter = Router();

auditLogRouter.get('/', authorize('settings:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.organizationDbId;
    if (!organizationId) {
      res.status(400).json({ error: 'Missing organization context' });
      return;
    }

    const rawLimit = parseInt((req.query['limit'] as string) ?? '50', 10);
    const rawPage = parseInt((req.query['page'] as string) ?? '1', 10);
    const limit = Math.min(Math.max(rawLimit, 1), 200);
    const page = Math.max(rawPage, 1);
    const skip = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where: {
          action: 'PERMISSION_DENIED',
          organizationId,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({
        where: {
          action: 'PERMISSION_DENIED',
          organizationId,
        },
      }),
    ]);

    res.json({ data, total, page, limit });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
