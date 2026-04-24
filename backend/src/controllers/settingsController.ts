import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  getOrgSettings,
  updateOrgSettings,
  getOrgUsers,
  updateOrgUser,
  removeOrgUser,
  getNotificationSettings,
  updateNotificationSettings,
  updateProfile,
} from '../services/settingsService';
import { inviteUser } from '../services/inviteService';
import { trackEvent } from '../services/analyticsService';

// ─── Validation schemas ───────────────────────────────────────────────────────

const updateUserSchema = z.object({
  role:      z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(), // OWNER cannot be assigned via API
  isActive:  z.boolean().optional(),
  firstName: z.string().min(1).max(80).optional(),
  lastName:  z.string().min(1).max(80).optional(),
});

// ─── Org ──────────────────────────────────────────────────────────────────────

export const getOrgHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const data = await getOrgSettings(organizationDbId!);
    res.json({ data });
  } catch (err) { next(err); }
};

export const updateOrgHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const data = await updateOrgSettings(organizationDbId!, req.body as Parameters<typeof updateOrgSettings>[1]);
    res.json({ data });
  } catch (err) { next(err); }
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const getUsersHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const data = await getOrgUsers(organizationDbId!);
    res.json({ data });
  } catch (err) { next(err); }
};

export const inviteUserHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as { email: string; firstName: string; lastName: string; role: string };
    const { invite, inviteLink } = await inviteUser({
      organizationId:       authReq.organizationDbId!,
      email:                body.email,
      role:                 body.role as UserRole,
      invitedByClerkUserId: authReq.auth.userId,
    });
    void trackEvent(authReq.organizationDbId!, 'user_invited');
    res.status(201).json({ data: { invite, inviteLink } });
  } catch (err) { next(err); }
};

export const updateUserHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const id = req.params['id'] as string;
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(400, parsed.error.message, 'VALIDATION_ERROR'));
    const data = await updateOrgUser(id, authReq.organizationDbId!, parsed.data);
    res.json({ data });
  } catch (err) { next(err); }
};

export const removeUserHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const id = req.params['id'] as string;
    await removeOrgUser(id, authReq.organizationDbId!);
    res.json({ data: null });
  } catch (err) { next(err); }
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const getNotificationsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const data = await getNotificationSettings(organizationDbId!);
    res.json({ data });
  } catch (err) { next(err); }
};

export const updateNotificationsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const data = await updateNotificationSettings(organizationDbId!, req.body as Parameters<typeof updateNotificationSettings>[1]);
    res.json({ data });
  } catch (err) { next(err); }
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const updateProfileHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    // Find the DB user record by Clerk userId
    const dbUser = await prisma.user.findFirst({
      where: { clerkUserId: authReq.auth.userId, organizationId: authReq.organizationDbId! },
    });
    if (!dbUser) { res.status(404).json({ message: 'User not found' }); return; }
    const data = await updateProfile(dbUser.id, authReq.organizationDbId!, req.body as Parameters<typeof updateProfile>[2]);
    res.json({ data });
  } catch (err) { next(err); }
};
