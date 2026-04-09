import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../lib/prisma';
import {
  getOrgSettings,
  updateOrgSettings,
  getOrgUsers,
  updateOrgUser,
  removeOrgUser,
  inviteUser,
  getNotificationSettings,
  updateNotificationSettings,
  updateProfile,
} from '../services/settingsService';

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
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: authReq.organizationDbId! } });
    const data = await inviteUser(authReq.organizationDbId!, org.clerkOrgId, req.body as { email: string; firstName: string; lastName: string; role: string });
    res.status(201).json({ data });
  } catch (err) { next(err); }
};

export const updateUserHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const id = req.params['id'] as string;
    const data = await updateOrgUser(id, authReq.organizationDbId!, req.body as Parameters<typeof updateOrgUser>[2]);
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
    const data = getNotificationSettings(organizationDbId!);
    res.json({ data });
  } catch (err) { next(err); }
};

export const updateNotificationsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const data = updateNotificationSettings(organizationDbId!, req.body as Parameters<typeof updateNotificationSettings>[1]);
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
