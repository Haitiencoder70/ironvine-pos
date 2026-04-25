import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from './errorHandler';
import { logger } from '../lib/logger';

/**
 * Subscription plan limits — mirrors the values in SUBSCRIPTION_LIMITS but
 * stored directly on the Organisation row so they can be overridden per-tenant
 * without a code deploy.
 *
 * A limit of -1 means unlimited.
 */

interface OrgLimits {
  plan: string;
  maxUsers: number;
  maxOrders: number;
  maxInventoryItems: number;
  maxCustomers: number;
  storageLimit: number; // bytes
}

async function fetchOrgLimits(orgDbId: string): Promise<OrgLimits | null> {
  return prisma.organization.findUnique({
    where: { id: orgDbId },
    select: {
      plan: true,
      maxUsers: true,
      maxOrders: true,
      maxInventoryItems: true,
      maxCustomers: true,
      storageLimit: true,
    },
  });
}

function upgradeMessage(resource: string, current: number, max: number, plan: string): string {
  return (
    `Plan limit reached for "${resource}": ${current}/${max} used (${plan} plan). ` +
    'Please upgrade your subscription to continue.'
  );
}

/**
 * Generic limit checker factory.
 * Resolves `orgDbId` from `req.organizationDbId`, loads the org's limits,
 * counts the current usage, and calls next() or returns 402.
 */
function buildChecker(
  resource: string,
  limitField: keyof OrgLimits,
  counter: (orgDbId: string) => Promise<number>,
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const orgDbId = req.organizationDbId;
    if (!orgDbId) {
      return next(new AppError(500, 'Organisation context missing.', 'NO_ORG'));
    }

    try {
      const org = await fetchOrgLimits(orgDbId);
      if (!org) {
        return next(new AppError(404, 'Organisation not found.', 'ORG_NOT_FOUND'));
      }

      const max = org[limitField] as number;
      if (max === -1) return next(); // unlimited

      const current = await counter(orgDbId);
      if (current >= max) {
        return next(
          new AppError(
            402,
            upgradeMessage(resource, current, max, org.plan),
            'PLAN_LIMIT_REACHED',
          ),
        );
      }

      next();
    } catch (error) {
      logger.error('Failed to check usage limit', { error, resource, orgDbId });
      next(new AppError(500, 'Failed to enforce plan limits.', 'LIMIT_CHECK_ERROR'));
    }
  };
}

/**
 * Middleware: reject with 402 if the org is on the FREE plan and the 14-day
 * trial has expired. Apply before any mutation route on the FREE plan.
 */
export async function checkTrialExpiry(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const orgDbId = req.organizationDbId;
  if (!orgDbId) return next(new AppError(500, 'Organisation context missing.', 'NO_ORG'));

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgDbId },
      select: { plan: true, trialEndsAt: true },
    });
    if (!org) return next(new AppError(404, 'Organisation not found.', 'ORG_NOT_FOUND'));

    if (org.plan === 'FREE' && org.trialEndsAt && org.trialEndsAt < new Date()) {
      return next(
        new AppError(
          402,
          'Your 14-day free trial has expired. Please upgrade your plan to continue.',
          'TRIAL_EXPIRED',
        ),
      );
    }

    next();
  } catch (error) {
    logger.error('Failed to check trial expiry', { error, orgDbId });
    next(new AppError(500, 'Failed to enforce trial limits.', 'TRIAL_CHECK_ERROR'));
  }
}

/**
 * Middleware: reject with 402 if the org has reached its user seat limit.
 * Apply before the "create user / accept invite" handler.
 */
export const checkUserLimit = buildChecker(
  'users',
  'maxUsers',
  (orgDbId) => prisma.user.count({ where: { organizationId: orgDbId, isActive: true } }),
);

/**
 * Middleware: reject with 402 if the org has reached its order limit.
 * Apply before the "create order" handler.
 */
export const checkOrderLimit = buildChecker(
  'orders',
  'maxOrders',
  (orgDbId) => prisma.order.count({ where: { organizationId: orgDbId } }),
);

/**
 * Middleware: reject with 402 if the org has reached its inventory-item limit.
 * Apply before the "create inventory item" handler.
 */
export const checkInventoryLimit = buildChecker(
  'inventoryItems',
  'maxInventoryItems',
  (orgDbId) => prisma.inventoryItem.count({ where: { organizationId: orgDbId } }),
);

/**
 * Middleware: reject with 402 if the org has reached its customer limit.
 * Apply before the "create customer" handler.
 */
export const checkCustomerLimit = buildChecker(
  'customers',
  'maxCustomers',
  (orgDbId) => prisma.customer.count({ where: { organizationId: orgDbId } }),
);

/**
 * Middleware: reject with 402 if the org has reached its storage quota.
 * `req.body.fileSizeBytes` must be set by an upstream middleware (e.g. multer)
 * before this middleware runs.
 *
 * Apply before the "upload image / file" handler.
 */
export async function checkStorageLimit(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const orgDbId = req.organizationDbId;
  if (!orgDbId) {
    return next(new AppError(500, 'Organisation context missing.', 'NO_ORG'));
  }

  try {
    const org = await fetchOrgLimits(orgDbId);
    if (!org) {
      return next(new AppError(404, 'Organisation not found.', 'ORG_NOT_FOUND'));
    }

    const limitBytes = org.storageLimit;
    if (limitBytes === -1) return next(); // unlimited

    // Sum the size of all stored images for this org
    const result = await prisma.image.aggregate({
      _sum: { fileSize: true },
      where: { organizationId: orgDbId },
    });

    const usedBytes  = result._sum?.fileSize ?? 0;
    const incomingBytes: number = (req.body as Record<string, unknown>)?.['fileSizeBytes'] as number ?? 0;

    if (usedBytes + incomingBytes > limitBytes) {
      const usedMB  = Math.round(usedBytes  / 1024 / 1024);
      const limitMB = Math.round(limitBytes / 1024 / 1024);
      return next(
        new AppError(
          402,
          `Storage limit reached: ${usedMB} MB used of ${limitMB} MB (${org.plan} plan). ` +
            'Please upgrade your subscription or delete unused files.',
          'STORAGE_LIMIT_REACHED',
        ),
      );
    }

    next();
  } catch (error) {
    logger.error('Failed to check storage limit', { error, orgDbId });
    next(new AppError(500, 'Failed to enforce storage limits.', 'LIMIT_CHECK_ERROR'));
  }
}
