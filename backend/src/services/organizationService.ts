import { Organization, User, SubscriptionPlan } from '@prisma/client';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateOrganizationInput {
  clerkOrgId: string;
  name: string;
  slug: string;
  ownerClerkUserId: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  plan?: SubscriptionPlan;
}

export interface UpdateOrganizationInput {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  taxRate?: number;
  orderNumberPrefix?: string;
  currency?: string;
  timezone?: string;
}

export interface OrgUsageResult {
  users:          { current: number; max: number; pct: number; nearLimit: boolean };
  orders:         { current: number; max: number; pct: number; nearLimit: boolean };
  inventoryItems: { current: number; max: number; pct: number; nearLimit: boolean };
  customers:      { current: number; max: number; pct: number; nearLimit: boolean };
  storage:        { currentBytes: number; maxBytes: number; pct: number; nearLimit: boolean };
  plan: string;
}

export interface OrgWithOwner {
  organization: Organization;
  owner: User;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

function validateSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) {
    throw new AppError(
      400,
      'Slug must be 3–63 characters, lowercase letters, numbers and hyphens only, ' +
        'and must not start or end with a hyphen.',
      'INVALID_SLUG',
    );
  }
}

function usagePct(current: number, max: number): number {
  if (max === -1) return 0; // unlimited
  return Math.round((current / max) * 100);
}

function nearLimit(current: number, max: number): boolean {
  if (max === -1) return false;
  return current / max >= 0.8;
}

function usageStat(current: number, max: number) {
  return { current, max, pct: usagePct(current, max), nearLimit: nearLimit(current, max) };
}

// ─── createOrganization ───────────────────────────────────────────────────────

export async function createOrganization(input: CreateOrganizationInput): Promise<OrgWithOwner> {
  const {
    clerkOrgId,
    name,
    slug,
    ownerClerkUserId,
    ownerEmail,
    ownerFirstName,
    ownerLastName,
    plan = 'FREE',
  } = input;

  validateSlug(slug);

  // Check slug / subdomain uniqueness
  const [slugConflict, subdomainConflict, clerkConflict] = await Promise.all([
    prisma.organization.findUnique({ where: { slug },           select: { id: true } }),
    prisma.organization.findUnique({ where: { subdomain: slug },select: { id: true } }),
    prisma.organization.findUnique({ where: { clerkOrgId },     select: { id: true } }),
  ]);

  if (slugConflict || subdomainConflict) {
    throw new AppError(409, `The slug "${slug}" is already taken.`, 'SLUG_TAKEN');
  }
  if (clerkConflict) {
    throw new AppError(409, 'This Clerk organisation already has a local record.', 'ORG_EXISTS');
  }

  const { organization, owner } = await prisma.$transaction(async (tx) => {
    const trialEndsAt = plan === 'FREE'
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      : null;

    const org = await tx.organization.create({
      data: {
        clerkOrgId,
        name,
        slug,
        subdomain: slug,
        plan,
        ...(trialEndsAt && { trialEndsAt }),
      },
    });

    const user = await tx.user.create({
      data: {
        clerkUserId:          ownerClerkUserId,
        email:                ownerEmail,
        firstName:            ownerFirstName,
        lastName:             ownerLastName,
        role:                 'OWNER',
        isOrganizationOwner:  true,
        isActive:             true,
        inviteAccepted:       true,
        organizationId:       org.id,
      },
    });

    // Default notification settings
    await tx.notificationSetting.create({
      data: {
        organizationId:        org.id,
        newOrderEmail:         true,
        orderStatusEmail:      true,
        lowStockEmail:         true,
        shipmentDeliveredEmail: true,
      },
    });

    // Sequence counter for order numbers
    await tx.sequenceCounter.create({
      data: { organizationId: org.id, counterKey: 'ORDER', lastValue: 0 },
    });

    await tx.activityLog.create({
      data: {
        action:        'CREATED',
        entityType:    'Organization',
        entityId:      org.id,
        entityLabel:   org.name,
        description:   `Organisation "${org.name}" created`,
        performedBy:   ownerClerkUserId,
        organizationId: org.id,
      },
    });

    return { organization: org, owner: user };
  });

  logger.info('Organisation created', { orgId: organization.id, slug });
  return { organization, owner };
}

// ─── updateOrganization ───────────────────────────────────────────────────────

export async function updateOrganization(
  orgDbId: string,
  input: UpdateOrganizationInput,
  performedBy: string,
): Promise<Organization> {
  const existing = await prisma.organization.findUnique({
    where: { id: orgDbId },
    select: { id: true, name: true },
  });
  if (!existing) throw new AppError(404, 'Organisation not found.', 'ORG_NOT_FOUND');

  // Validate hex colours if supplied
  const hexRe = /^#[0-9A-Fa-f]{6}$/;
  if (input.primaryColor   && !hexRe.test(input.primaryColor))
    throw new AppError(400, 'primaryColor must be a 6-digit hex colour (e.g. #2563eb).', 'INVALID_COLOR');
  if (input.secondaryColor && !hexRe.test(input.secondaryColor))
    throw new AppError(400, 'secondaryColor must be a 6-digit hex colour.', 'INVALID_COLOR');

  if (input.taxRate !== undefined && (input.taxRate < 0 || input.taxRate > 1))
    throw new AppError(400, 'taxRate must be between 0 and 1 (e.g. 0.085 for 8.5%).', 'INVALID_TAX_RATE');

  const updated = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.update({
      where: { id: orgDbId },
      data:  input,
    });

    await tx.activityLog.create({
      data: {
        action:        'UPDATED',
        entityType:    'Organization',
        entityId:      orgDbId,
        entityLabel:   org.name,
        description:   'Organisation settings updated',
        performedBy,
        organizationId: orgDbId,
      },
    });

    return org;
  });

  logger.info('Organisation updated', { orgId: orgDbId });
  return updated;
}

// ─── getOrganizationUsage ─────────────────────────────────────────────────────

export async function getOrganizationUsage(orgDbId: string): Promise<OrgUsageResult> {
  const org = await prisma.organization.findUnique({
    where:  { id: orgDbId },
    select: {
      plan:             true,
      maxUsers:         true,
      maxOrders:        true,
      maxInventoryItems: true,
      maxCustomers:     true,
      storageLimit:     true,
    },
  });
  if (!org) throw new AppError(404, 'Organisation not found.', 'ORG_NOT_FOUND');

  const [userCount, orderCount, inventoryCount, customerCount, storageAgg] = await Promise.all([
    prisma.user.count({ where: { organizationId: orgDbId, isActive: true } }),
    prisma.order.count({ where: { organizationId: orgDbId } }),
    prisma.inventoryItem.count({ where: { organizationId: orgDbId } }),
    prisma.customer.count({ where: { organizationId: orgDbId } }),
    prisma.image.aggregate({ _sum: { fileSize: true }, where: { organizationId: orgDbId } }),
  ]);

  const storageBytes = storageAgg._sum.fileSize ?? 0;

  return {
    plan:           org.plan,
    users:          usageStat(userCount,       org.maxUsers),
    orders:         usageStat(orderCount,      org.maxOrders),
    inventoryItems: usageStat(inventoryCount,  org.maxInventoryItems),
    customers:      usageStat(customerCount,   org.maxCustomers),
    storage: {
      currentBytes: storageBytes,
      maxBytes:     org.storageLimit,
      pct:          usagePct(storageBytes, org.storageLimit),
      nearLimit:    nearLimit(storageBytes, org.storageLimit),
    },
  };
}

// ─── deleteOrganization ───────────────────────────────────────────────────────
//
// Soft-delete strategy: mark the org's `settings` JSON with
//   { pendingDeletion: true, scheduledHardDeleteAt: <ISO string> }
// and deactivate all users so they can no longer log in.
// A separate cron / queue job is responsible for the physical purge after 30 days.
// Stripe subscription is cancelled immediately.

export async function deleteOrganization(orgDbId: string, performedBy: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where:  { id: orgDbId },
    select: { id: true, name: true, stripeSubscriptionId: true, settings: true, users: { select: { email: true } } },
  });
  if (!org) throw new AppError(404, 'Organisation not found.', 'ORG_NOT_FOUND');

  const scheduledHardDeleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Cancel Stripe subscription immediately (non-fatal if it fails)
  if (org.stripeSubscriptionId && env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
      await stripe.subscriptions.cancel(org.stripeSubscriptionId);
      logger.info('Stripe subscription cancelled', { subscriptionId: org.stripeSubscriptionId, orgId: orgDbId });
    } catch (err) {
      logger.error('Failed to cancel Stripe subscription during org deletion', { err, orgId: orgDbId });
    }
  }

  const existingSettings = (org.settings ?? {}) as Record<string, unknown>;

  await prisma.$transaction(async (tx) => {
    // Mark org as pending deletion
    await tx.organization.update({
      where: { id: orgDbId },
      data:  {
        settings: {
          ...existingSettings,
          pendingDeletion:       true,
          scheduledHardDeleteAt,
          deletedBy:             performedBy,
        },
        stripeSubscriptionId: null,
      },
    });

    // Deactivate all users so they lose access immediately
    await tx.user.updateMany({
      where: { organizationId: orgDbId },
      data:  { isActive: false },
    });

    await tx.activityLog.create({
      data: {
        action:        'DELETED',
        entityType:    'Organization',
        entityId:      orgDbId,
        entityLabel:   org.name,
        description:   `Organisation "${org.name}" marked for deletion. Hard delete scheduled at ${scheduledHardDeleteAt}.`,
        performedBy,
        organizationId: orgDbId,
      },
    });
  });

  logger.info('Organisation soft-deleted', { orgId: orgDbId, scheduledHardDeleteAt });
}
