import { Request, Response, NextFunction } from 'express';
import { createClerkClient } from '@clerk/express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { hasPermission, Permission } from '../config/permissions';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../lib/logger';

export const authorize = (...permissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    const clerkUserId = authReq.auth?.userId;
    const organizationDbId = req.organizationDbId;

    if (!clerkUserId || !organizationDbId) {
      res.status(403).json({ error: 'Forbidden', code: 'MISSING_AUTH_CONTEXT' });
      return;
    }

    try {
      let user = await prisma.user.findFirst({
        where: {
          clerkUserId,
          organizationId: organizationDbId,
        },
        select: {
          id: true,
          role: true,
          customPermissions: true,
        },
      });

      if (!user) {
        // JIT provisioning: requireAuth runs before injectTenant so orgDbId is
        // unavailable there. authorize() is the first place all context exists.
        try {
          const clerk = createClerkClient({
            secretKey: env.CLERK_SECRET_KEY,
            publishableKey: env.CLERK_PUBLISHABLE_KEY,
          });
          const clerkUser = await clerk.users.getUser(clerkUserId);
          const orgRole = authReq.auth?.orgRole;
          const role: UserRole = orgRole === 'org:admin' ? 'OWNER'
            : orgRole === 'org:manager' ? 'MANAGER'
            : 'STAFF';
          user = await prisma.user.create({
            data: {
              clerkUserId,
              email:               clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkUserId}@unknown.com`,
              firstName:           clerkUser.firstName ?? '',
              lastName:            clerkUser.lastName ?? '',
              avatarUrl:           clerkUser.imageUrl ?? null,
              role,
              isActive:            true,
              isOrganizationOwner: orgRole === 'org:admin',
              inviteAccepted:      true,
              organizationId:      organizationDbId,
            },
            select: { id: true, role: true, customPermissions: true },
          });
          logger.info('Auto-provisioned user via authorize JIT', { clerkUserId, organizationDbId });
        } catch (provisionErr) {
          logger.error('JIT user provisioning failed in authorize', { provisionErr, clerkUserId, organizationDbId });
          res.status(403).json({ error: 'Forbidden', code: 'USER_NOT_FOUND' });
          return;
        }
      }

      // user is guaranteed non-null here: either found above or JIT-created (catch returns early)
      const customPerms = user!.customPermissions as Record<string, boolean> | null;

      const allowed = permissions.some((permission) =>
        hasPermission(user!.role as UserRole, customPerms, permission),
      );

      if (!allowed) {
        await prisma.activityLog.create({
          data: {
            action: 'PERMISSION_DENIED',
            entityType: 'permission',
            entityId: permissions.join(','),
            description: `Access denied to ${permissions.join(', ')} for role ${user!.role}`,
            performedBy: user!.id,
            ipAddress: req.ip ?? req.socket.remoteAddress,
            metadata: {
              permissions,
              role: user!.role,
              path: req.path,
              method: req.method,
            },
            organizationId: organizationDbId,
          },
        });
        res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' });
        return;
      }

      authReq.dbUser = {
        id: user!.id,
        role: user!.role as UserRole,
        customPermissions: customPerms,
      };

      next();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error', code: 'AUTHORIZE_ERROR' });
    }
  };
};
