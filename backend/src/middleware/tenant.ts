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
    // upsert: create the org row on first API call if it doesn't exist yet.
    // Clerk is the source of truth; we just need a local DB record to
    // attach all tenant-scoped data to.
    const org = await prisma.organization.upsert({
      where:  { clerkOrgId: authReq.auth.orgId },
      update: {},
      create: {
        clerkOrgId: authReq.auth.orgId,
        name:       authReq.auth.orgId,   // placeholder; overwritten via Settings page
        slug:       authReq.auth.orgId,
        subdomain:  authReq.auth.orgId,
        plan:       'FREE',
      },
      select: { id: true },
    });

    req.organizationId    = authReq.auth.orgId;
    req.organizationDbId  = org.id;
    next();
  } catch (error) {
    logger.error('Failed to inject tenant', { error });
    next(new AppError(500, 'Failed to resolve organization', 'TENANT_ERROR'));
  }
}
