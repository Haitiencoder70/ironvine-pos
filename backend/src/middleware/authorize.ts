import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { hasPermission, Permission } from '../config/permissions';
import { UserRole } from '@prisma/client';

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
      const user = await prisma.user.findFirst({
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
        res.status(403).json({ error: 'Forbidden', code: 'USER_NOT_FOUND' });
        return;
      }

      const customPerms = user.customPermissions as Record<string, boolean> | null;

      const allowed = permissions.some((permission) =>
        hasPermission(user.role as UserRole, customPerms, permission),
      );

      if (!allowed) {
        await prisma.activityLog.create({
          data: {
            action: 'PERMISSION_DENIED',
            entityType: 'permission',
            entityId: permissions.join(','),
            description: `Access denied to ${permissions.join(', ')} for role ${user.role}`,
            performedBy: user.id,
            ipAddress: req.ip ?? req.socket.remoteAddress,
            metadata: {
              permissions,
              role: user.role,
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
        id: user.id,
        role: user.role as UserRole,
        customPermissions: customPerms,
      };

      next();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error', code: 'AUTHORIZE_ERROR' });
    }
  };
};
