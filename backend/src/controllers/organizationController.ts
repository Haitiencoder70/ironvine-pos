import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getAuth } from '@clerk/express';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import {
  updateOrganization,
  getOrganizationUsage,
} from '../services/organizationService';
import {
  inviteUser,
  cancelInvite,
  getInviteByToken,
  acceptInvite,
} from '../services/inviteService';

// ─── Validation schemas ───────────────────────────────────────────────────────

const updateOrgSchema = z.object({
  name:             z.string().min(1).max(120).optional(),
  logoUrl:          z.string().url().optional().nullable(),
  primaryColor:     z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a 6-digit hex colour').optional().nullable(),
  secondaryColor:   z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a 6-digit hex colour').optional().nullable(),
  taxRate:          z.number().min(0).max(1).optional(),
  orderNumberPrefix: z.string().min(1).max(10).optional(),
  currency:         z.string().length(3).toUpperCase().optional(),
  timezone:         z.string().min(1).optional(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role:  z.enum(['OWNER', 'ADMIN', 'MANAGER', 'STAFF']),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']),  // Cannot set OWNER via API
});

const acceptInviteSchema = z.object({
  token:      z.string().min(1),
  clerkUserId: z.string().min(1),
  firstName:  z.string().min(1).max(80),
  lastName:   z.string().min(1).max(80),
  avatarUrl:  z.string().url().optional(),
});

// ─── getCurrent ───────────────────────────────────────────────────────────────

export const getCurrent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;

    const org = await prisma.organization.findUnique({
      where:  { id: orgDbId },
      select: {
        id: true, name: true, slug: true, subdomain: true, logoUrl: true,
        plan: true, subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true,
        primaryColor: true, secondaryColor: true, taxRate: true, orderNumberPrefix: true,
        currency: true, timezone: true, enabledModules: true, customDomain: true, createdAt: true,
      },
    });

    if (!org) return next(new AppError(404, 'Organisation not found.', 'ORG_NOT_FOUND'));

    res.json({ data: org });
  } catch (err) {
    next(err);
  }
};

// ─── update ───────────────────────────────────────────────────────────────────

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;

    const parsed = updateOrgSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(400, parsed.error.message, 'VALIDATION_ERROR'));

    const { logoUrl, primaryColor, secondaryColor, ...rest } = parsed.data;
    const updateInput = {
      ...rest,
      ...(logoUrl !== undefined && { logoUrl: logoUrl === null ? undefined : logoUrl }),
      ...(primaryColor !== undefined && { primaryColor: primaryColor === null ? undefined : primaryColor }),
      ...(secondaryColor !== undefined && { secondaryColor: secondaryColor === null ? undefined : secondaryColor }),
    };
    const updated = await updateOrganization(orgDbId, updateInput, authReq.auth.userId);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

// ─── getUsage ─────────────────────────────────────────────────────────────────

export const getUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const usage   = await getOrganizationUsage(authReq.organizationDbId!);
    res.json({ data: usage });
  } catch (err) {
    next(err);
  }
};

// ─── getTeam ──────────────────────────────────────────────────────────────────

export const getTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;

    const [users, pendingInvites] = await Promise.all([
      prisma.user.findMany({
        where:   { organizationId: orgDbId },
        select:  { id: true, clerkUserId: true, email: true, firstName: true, lastName: true,
                   avatarUrl: true, role: true, isActive: true, isOrganizationOwner: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.organizationInvite.findMany({
        where:   { organizationId: orgDbId, acceptedAt: null, expiresAt: { gt: new Date() } },
        select:  { id: true, email: true, role: true, expiresAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({ data: { users, pendingInvites } });
  } catch (err) {
    next(err);
  }
};

// ─── inviteUserHandler ────────────────────────────────────────────────────────

export const inviteUserHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;

    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(400, parsed.error.message, 'VALIDATION_ERROR'));

    const { invite, inviteLink } = await inviteUser({
      organizationId:       orgDbId,
      email:                parsed.data.email,
      role:                 parsed.data.role,
      invitedByClerkUserId: authReq.auth.userId,
    });

    res.status(201).json({ data: { invite, inviteLink } });
  } catch (err) {
    next(err);
  }
};

// ─── cancelInviteHandler ──────────────────────────────────────────────────────

export const cancelInviteHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const inviteId = req.params['inviteId'] as string;

    await cancelInvite(inviteId, orgDbId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── getInviteDetails (public — used by accept invite page) ──────────────────

export const getInviteDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.params['token'] as string;
    const invite = await getInviteByToken(token);
    res.json({ data: { email: invite.email, role: invite.role, organization: invite.organization, expiresAt: invite.expiresAt } });
  } catch (err) {
    next(err);
  }
};

// ─── acceptInviteHandler (public) ────────────────────────────────────────────

export const acceptInviteHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = acceptInviteSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(400, parsed.error.message, 'VALIDATION_ERROR'));

    const result = await acceptInvite(parsed.data);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

// ─── removeUser ───────────────────────────────────────────────────────────────

export const removeUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq  = req as AuthenticatedRequest;
    const orgDbId  = authReq.organizationDbId!;
    const userId   = req.params['userId'] as string;

    const target = await prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, organizationId: true, isOrganizationOwner: true, clerkUserId: true, firstName: true, lastName: true },
    });

    if (!target || target.organizationId !== orgDbId)
      return next(new AppError(404, 'User not found.', 'USER_NOT_FOUND'));

    if (target.isOrganizationOwner)
      return next(new AppError(403, 'The organisation owner cannot be removed.', 'CANNOT_REMOVE_OWNER'));

    if (target.clerkUserId === authReq.auth.userId)
      return next(new AppError(400, 'You cannot remove yourself.', 'CANNOT_REMOVE_SELF'));

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { isActive: false } });

      await tx.activityLog.create({
        data: {
          action:        'DELETED',
          entityType:    'User',
          entityId:      userId,
          entityLabel:   `${target.firstName} ${target.lastName}`,
          description:   `User ${target.firstName} ${target.lastName} removed from organisation.`,
          performedBy:   authReq.auth.userId,
          organizationId: orgDbId,
        },
      });
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── updateUserRole ───────────────────────────────────────────────────────────

export const updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const userId  = req.params['userId'] as string;

    const parsed = updateUserRoleSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(400, parsed.error.message, 'VALIDATION_ERROR'));

    const target = await prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, organizationId: true, isOrganizationOwner: true, firstName: true, lastName: true },
    });

    if (!target || target.organizationId !== orgDbId)
      return next(new AppError(404, 'User not found.', 'USER_NOT_FOUND'));

    if (target.isOrganizationOwner)
      return next(new AppError(403, 'The owner\'s role cannot be changed.', 'CANNOT_CHANGE_OWNER_ROLE'));

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data:  { role: parsed.data.role },
      });

      await tx.activityLog.create({
        data: {
          action:        'UPDATED',
          entityType:    'User',
          entityId:      userId,
          entityLabel:   `${target.firstName} ${target.lastName}`,
          description:   `User role changed to ${parsed.data.role}`,
          performedBy:   authReq.auth.userId,
          organizationId: orgDbId,
        },
      });

      return user;
    });

    res.json({ data: { id: updated.id, role: updated.role } });
  } catch (err) {
    next(err);
  }
};

// ─── getBilling ───────────────────────────────────────────────────────────────

export const getBilling = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;

    const org = await prisma.organization.findUnique({
      where:  { id: orgDbId },
      select: {
        plan: true, subscriptionStatus: true, stripeCustomerId: true,
        stripeSubscriptionId: true, trialEndsAt: true, subscriptionEndsAt: true,
        maxUsers: true, maxOrders: true, maxInventoryItems: true, maxCustomers: true, storageLimit: true,
      },
    });

    if (!org) return next(new AppError(404, 'Organisation not found.', 'ORG_NOT_FOUND'));

    res.json({ data: org });
  } catch (err) {
    next(err);
  }
};

// ─── getInvoices ──────────────────────────────────────────────────────────────

export const getInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;

    const history = await prisma.billingHistory.findMany({
      where:   { organizationId: orgDbId },
      orderBy: { createdAt: 'desc' },
      take:    50,
    });

    res.json({ data: history });
  } catch (err) {
    next(err);
  }
};

// ─── checkSlugAvailability ────────────────────────────────────────────────────
// Public — no tenant context required (used before org is created).

const slugCheckSchema = z.object({
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, or hyphens'),
});

export const checkSlugAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = slugCheckSchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new AppError(400, parsed.error.errors[0]?.message ?? 'Invalid slug', 'VALIDATION_ERROR'));
    }

    const { slug } = parsed.data;
    const existing = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      const base = slug.replace(/-\d+$/, '');
      const suggestions = [1, 2, 3].map((n) => `${base}-${n}`);
      res.json({ available: false, suggestions });
    } else {
      res.json({ available: true });
    }
  } catch (err) {
    next(err);
  }
};

// ─── createOrganization ───────────────────────────────────────────────────────
// Requires Clerk auth but NO tenant context — creates the org for the first time.

const createOrgSchema = z.object({
  name:           z.string().min(1).max(120),
  slug:           z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, or hyphens'),
  industry:       z.string().min(1).max(80),
  ownerFirstName: z.string().max(80).optional().or(z.literal('')),
  ownerLastName:  z.string().max(80).optional().or(z.literal('')),
  ownerEmail:     z.string().email().optional().or(z.literal('')),
  plan:           z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
});

export const createOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      return next(new AppError(401, 'Authentication required.', 'UNAUTHENTICATED'));
    }

    const parsed = createOrgSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION_ERROR'));
    }

    const { name, slug, plan } = parsed.data;

    // Ensure slug is unique
    const existing = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      return next(new AppError(409, 'That slug is already taken.', 'SLUG_TAKEN'));
    }

    // Use Clerk orgId from session if available, otherwise use userId as placeholder
    const clerkOrgId = auth.orgId ?? `pending_${auth.userId}`;

    const org = await prisma.organization.upsert({
      where:  { clerkOrgId },
      update: { name, slug, subdomain: slug },
      create: {
        clerkOrgId,
        name,
        slug,
        subdomain: slug,
        plan: plan === 'PROFESSIONAL' ? 'PRO' : plan as 'FREE' | 'STARTER' | 'ENTERPRISE',
      },
      select: { id: true, slug: true },
    });

    res.status(201).json({ organizationId: org.id });
  } catch (err) {
    next(err);
  }
};
