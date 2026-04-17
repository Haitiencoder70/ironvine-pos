import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { SUBSCRIPTION_LIMITS } from '../types';
import { AppError } from './errorHandler';
import { logger } from '../lib/logger';

type LimitableResource = 'orders' | 'inventoryItems' | 'users' | 'customers';

const RESOURCE_LIMIT_KEY: Record<LimitableResource, 'maxOrders' | 'maxInventoryItems' | 'maxUsers' | 'maxCustomers'> = {
  orders: 'maxOrders',
  inventoryItems: 'maxInventoryItems',
  users: 'maxUsers',
  customers: 'maxCustomers',
};

const RESOURCE_COUNT_QUERY = {
  orders: (orgDbId: string) => prisma.order.count({ where: { organizationId: orgDbId } }),
  inventoryItems: (orgDbId: string) => prisma.inventoryItem.count({ where: { organizationId: orgDbId } }),
  users: (orgDbId: string) => prisma.user.count({ where: { organizationId: orgDbId } }),
  customers: (orgDbId: string) => prisma.customer.count({ where: { organizationId: orgDbId } }),
} as const;

export function checkLimit(resource: LimitableResource) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const orgDbId = req.organizationDbId;
    if (!orgDbId) {
      return next(new AppError(500, 'Organization context missing', 'NO_ORG'));
    }

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgDbId },
        select: { plan: true },
      });

      if (!org) {
        return next(new AppError(404, 'Organization not found', 'ORG_NOT_FOUND'));
      }

      const limitKey = RESOURCE_LIMIT_KEY[resource];
      const maxValue = SUBSCRIPTION_LIMITS[org.plan][limitKey];

      if (maxValue === -1) {
        return next();
      }

      const current = await RESOURCE_COUNT_QUERY[resource](orgDbId);

      if (current >= maxValue) {
        return next(
          new AppError(
            403,
            `Plan limit reached: ${resource} (${current}/${maxValue}). Please upgrade your plan.`,
            'PLAN_LIMIT_REACHED',
          ),
        );
      }

      next();
    } catch (error) {
      logger.error('Failed to check plan limit', { error, resource, orgDbId });
      next(new AppError(500, 'Failed to enforce plan limits', 'LIMIT_CHECK_ERROR'));
    }
  };
}
