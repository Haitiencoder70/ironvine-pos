import { clerkMiddleware, getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError } from './errorHandler';

export const clerkAuth = clerkMiddleware();

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const auth = getAuth(req);

  if (!auth.userId) {
    return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
  }

  if (!auth.orgId) {
    return next(new AppError(403, 'Organization context required', 'NO_ORG_CONTEXT'));
  }

  (req as AuthenticatedRequest).auth = {
    userId: auth.userId,
    orgId: auth.orgId,
    orgRole: auth.orgRole ?? '',
  };

  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.auth.orgRole || !allowedRoles.includes(authReq.auth.orgRole)) {
      return next(new AppError(403, 'Insufficient permissions', 'FORBIDDEN'));
    }
    next();
  };
}
