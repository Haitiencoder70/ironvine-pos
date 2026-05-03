import { clerkMiddleware, getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError } from './errorHandler';
import { logger } from '../lib/logger';
import { env } from '../config/env';

const rawClerkAuth = clerkMiddleware({
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
  secretKey: env.CLERK_SECRET_KEY,
});

export const clerkAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    rawClerkAuth(req, res, (err) => {
      if (err) {
        logger.error('clerkMiddleware passed an error to next', { error: err.message, stack: err.stack });
        res.status(500).json({
          error: 'Authentication service error',
          code: 'AUTH_SERVICE_ERROR',
        });
        return;
      }
      next();
    });
  } catch (err) {
    logger.error('clerkMiddleware threw an error synchronously', { error: (err as Error).message });
    res.status(500).json({
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR',
    });
    return;
  }
};

/**
 * Verify the request carries a valid Clerk session with an active org context.
 *
 * Must run AFTER `clerkAuth` (which populates `getAuth(req)`).
 * Tenant matching and DB user provisioning happen later, after `injectTenant`
 * resolves the requested tenant.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);

  if (!auth.userId) {
    return next(new AppError(401, 'Authentication required.', 'UNAUTHENTICATED'));
  }

  if (!auth.orgId) {
    return next(new AppError(403, 'Organisation context required.', 'NO_ORG_CONTEXT'));
  }

  (req as AuthenticatedRequest).auth = {
    userId:  auth.userId,
    orgId:   auth.orgId,
    orgRole: auth.orgRole ?? '',
  };

  next();
}

/**
 * Require that the authenticated user holds one of the given Clerk org roles.
 * Must run after `requireAuth`.
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.auth?.orgRole || !allowedRoles.includes(authReq.auth.orgRole)) {
      return next(new AppError(403, 'Insufficient permissions.', 'FORBIDDEN'));
    }
    next();
  };
}
