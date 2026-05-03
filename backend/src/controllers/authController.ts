import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../lib/prisma';

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    // Attempt to fetch user from DB if synced, otherwise just return the clerk auth payload
    const user = await prisma.user.findFirst({
      where: {
        clerkUserId: authReq.auth.userId,
        organizationId: req.organizationDbId,
      },
      include: {
        organization: true,
      },
    });

    if (user) {
      res.json({ data: user });
    } else {
      res.json({ 
        data: { 
          id: authReq.auth.userId, 
          organizationId: authReq.organizationDbId,
          role: authReq.auth.orgRole, 
          _source: 'clerk_token'
        } 
      });
    }
  } catch (err) {
    next(err);
  }
};
