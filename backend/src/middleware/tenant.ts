import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { AppError } from './errorHandler';
import { logger } from '../lib/logger';

declare module 'express' {
  interface Request {
    organizationId?: string;
    organizationDbId?: string;
  }
}

export async function injectTenant(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  try {
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: authReq.auth.orgId },
      select: { id: true },
    });

    if (!org) {
      return next(new AppError(404, 'Organization not found', 'ORG_NOT_FOUND'));
    }

    req.organizationId = authReq.auth.orgId;
    req.organizationDbId = org.id;
    next();
  } catch (error) {
    logger.error('Failed to inject tenant', { error });
    next(new AppError(500, 'Failed to resolve organization', 'TENANT_ERROR'));
  }
}
