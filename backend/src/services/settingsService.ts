import { prisma } from '../lib/prisma';
import { clerkClient } from '@clerk/express';

// ─── Org Settings ─────────────────────────────────────────────────────────────

export async function getOrgSettings(organizationId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl,
    plan: org.plan,
    subscriptionStatus: org.subscriptionStatus,
    taxRate: Number(org.taxRate),
    orderNumberPrefix: org.orderNumberPrefix,
    currency: org.currency,
    timezone: org.timezone,
  };
}

export async function updateOrgSettings(
  organizationId: string,
  data: {
    name?: string;
    taxRate?: number;
    orderNumberPrefix?: string;
    currency?: string;
    timezone?: string;
    logoUrl?: string;
  },
) {
  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
      ...(data.orderNumberPrefix !== undefined && { orderNumberPrefix: data.orderNumberPrefix }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
    },
  });
  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    logoUrl: updated.logoUrl,
    plan: updated.plan,
    subscriptionStatus: updated.subscriptionStatus,
    taxRate: Number(updated.taxRate),
    orderNumberPrefix: updated.orderNumberPrefix,
    currency: updated.currency,
    timezone: updated.timezone,
  };
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getOrgUsers(organizationId: string) {
  return prisma.user.findMany({
    where: { organizationId },
    orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    select: {
      id: true,
      clerkUserId: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function updateOrgUser(
  userId: string,
  organizationId: string,
  data: { role?: string; isActive?: boolean; firstName?: string; lastName?: string },
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.organizationId !== organizationId) throw new Error('Forbidden');

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.role !== undefined && { role: data.role as 'OWNER' | 'MANAGER' | 'STAFF' }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
    },
    select: {
      id: true,
      clerkUserId: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function removeOrgUser(userId: string, organizationId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.organizationId !== organizationId) throw new Error('Forbidden');
  await prisma.user.delete({ where: { id: userId } });
}

export async function inviteUser(
  organizationId: string,
  clerkOrgId: string,
  data: { email: string; firstName: string; lastName: string; role: string },
) {
  // Create invitation via Clerk
  await clerkClient.organizations.createOrganizationInvitation({
    organizationId: clerkOrgId,
    emailAddress: data.email,
    role: data.role === 'OWNER' ? 'org:admin' : data.role === 'MANAGER' ? 'org:manager' : 'org:member',
    inviterUserId: '',
  });

  // Optimistically create user row (will be fully populated on first login)
  const user = await prisma.user.upsert({
    where: { email_organizationId: { email: data.email, organizationId } },
    create: {
      clerkUserId: `pending_${Date.now()}`,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as 'OWNER' | 'MANAGER' | 'STAFF',
      organizationId,
      isActive: false,
    },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as 'OWNER' | 'MANAGER' | 'STAFF',
    },
    select: {
      id: true,
      clerkUserId: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
  return user;
}

// ─── Notification Settings ────────────────────────────────────────────────────
// Stored as a JSON blob in a simple key/value table or in org metadata.
// For now we use a dedicated model-less approach: store in org's activityLogs or
// use a lightweight in-memory default with DB persistence via a settings JSON field.
// Since schema doesn't have a notificationSettings field, we embed in a pseudo-table
// approach using a dedicated settings JSON stored per org in a well-known activityLog entry.
// Simpler: return/save as a plain object with defaults. Frontend handles local persistence
// for now; backend stores nothing (this is a UI-only feature until a settings table is added).

const notificationDefaults = {
  newOrderEmail: true,
  orderStatusEmail: true,
  lowStockEmail: true,
  poReceivedEmail: false,
  shipmentDeliveredEmail: true,
  recipients: [] as string[],
};

// In-memory per-org map (resets on restart — acceptable until proper settings table added)
const notificationStore = new Map<string, typeof notificationDefaults>();

export function getNotificationSettings(organizationId: string) {
  return notificationStore.get(organizationId) ?? { ...notificationDefaults };
}

export function updateNotificationSettings(
  organizationId: string,
  data: Partial<typeof notificationDefaults>,
) {
  const current = getNotificationSettings(organizationId);
  const updated = { ...current, ...data };
  notificationStore.set(organizationId, updated);
  return updated;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  organizationId: string,
  data: { firstName?: string; lastName?: string; avatarUrl?: string },
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.organizationId !== organizationId) throw new Error('Forbidden');

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
    },
    select: {
      id: true,
      clerkUserId: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}
