import { clerkMiddleware, getAuth, createClerkClient } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError } from './errorHandler';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export const clerkAuth = clerkMiddleware();

/**
 * Verify the request carries a valid Clerk session and that the authenticated
 * user is a member of the organisation resolved by `injectTenant`.
 *
 * Must run AFTER `clerkAuth` (which populates `getAuth(req)`) and
 * AFTER `injectTenant` (which populates `req.organizationDbId`).
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

  // Skip orgId check when the tenant was already resolved via subdomain/header.
  // injectTenant already verified the org exists; orgId in the JWT is optional
  // in that case (user may not have an active org set in their Clerk session).
  if (!auth.orgId && !req.organizationDbId) {
    return next(new AppError(403, 'Organisation context required.', 'NO_ORG_CONTEXT'));
  }

  // ── Cross-check: user must belong to the resolved tenant ──────────────────
  // `req.organizationDbId` is set by injectTenant. When the tenant is resolved
  // via subdomain, this is the canonical check that prevents a user from one
  // Clerk org from accessing another org's subdomain.
  const orgDbId = req.organizationDbId;

  if (orgDbId) {
    try {
      const membership = await prisma.user.findFirst({
        where: {
          clerkUserId:    auth.userId,
          organizationId: orgDbId,
          isActive:       true,
        },
        select: { id: true, role: true },
      });

      if (!membership) {
        // Just-in-time provisioning: create the user row on first authenticated
        // request if they have a valid Clerk session but no DB record yet.
        try {
          const clerk = createClerkClient({ secretKey: process.env['CLERK_SECRET_KEY'] });
          const clerkUser = await clerk.users.getUser(auth.userId);
          const role = auth.orgRole === 'org:admin' ? 'OWNER'
            : auth.orgRole === 'org:manager' ? 'MANAGER'
            : 'STAFF';
          await prisma.user.create({
            data: {
              clerkUserId:         auth.userId,
              email:               clerkUser.emailAddresses[0]?.emailAddress ?? `${auth.userId}@unknown.com`,
              firstName:           clerkUser.firstName ?? '',
              lastName:            clerkUser.lastName ?? '',
              avatarUrl:           clerkUser.imageUrl ?? null,
              role:                role as 'OWNER' | 'MANAGER' | 'STAFF',
              isActive:            true,
              isOrganizationOwner: auth.orgRole === 'org:admin',
              organizationId:      orgDbId,
            },
          });
          logger.info('Auto-provisioned user on first login', { userId: auth.userId, orgDbId });
        } catch (provisionErr) {
          logger.error('Failed to auto-provision user', { provisionErr });
          return next(new AppError(403, 'You are not a member of this organisation.', 'NOT_ORG_MEMBER'));
        }
      }
    } catch (error) {
      logger.error('Failed to verify org membership', { error });
      return next(new AppError(500, 'Failed to verify organisation membership.', 'MEMBERSHIP_CHECK_ERROR'));
    }
  }

  if (!auth.orgId) {
    return next(new AppError(401, 'No organisation context found.', 'NO_ORG_CONTEXT'));
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
