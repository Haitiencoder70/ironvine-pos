import { Prisma, Vendor } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import type { PaginatedResult, PaginationInput } from '../types/services';

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateVendorInput {
  organizationId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
  categories?: string[];
  paymentTerms?: string;
  leadTimeDays?: number;
  performedBy: string;
}

export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
  const {
    organizationId,
    name,
    contactName,
    email,
    phone,
    website,
    notes,
    categories = [],
    paymentTerms,
    leadTimeDays,
    performedBy,
  } = input;

  // Check for duplicate name within org
  const existing = await prisma.vendor.findUnique({
    where: { name_organizationId: { name, organizationId } },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(409, `A vendor named "${name}" already exists`, 'VENDOR_NAME_EXISTS');
  }

  const vendor = await prisma.$transaction(async (tx) => {
    const created = await tx.vendor.create({
      data: {
        organizationId,
        name,
        contactName,
        email,
        phone,
        website,
        notes,
        categories,
        paymentTerms,
        leadTimeDays,
        isActive: true,
      },
    });

    await tx.activityLog.create({
      data: {
        action: 'CREATED',
        entityType: 'Vendor',
        entityId: created.id,
        entityLabel: name,
        description: `Vendor "${name}" created`,
        performedBy,
        organizationId,
      },
    });

    return created;
  });

  logger.info('Vendor created', { vendorId: vendor.id, organizationId });
  return vendor;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateVendorInput {
  organizationId: string;
  vendorId: string;
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
  categories?: string[];
  paymentTerms?: string;
  leadTimeDays?: number;
  isActive?: boolean;
  performedBy: string;
}

export async function updateVendor(input: UpdateVendorInput): Promise<Vendor> {
  const { organizationId, vendorId, performedBy, name, ...rest } = input;

  const existing = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, organizationId: true, name: true },
  });

  if (!existing || existing.organizationId !== organizationId) {
    throw new AppError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');
  }

  // Check name uniqueness within org if name is being changed
  if (name && name !== existing.name) {
    const duplicate = await prisma.vendor.findUnique({
      where: { name_organizationId: { name, organizationId } },
      select: { id: true },
    });
    if (duplicate) {
      throw new AppError(409, `A vendor named "${name}" already exists`, 'VENDOR_NAME_EXISTS');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.vendor.update({
      where: { id: vendorId },
      data: { name, ...rest },
    });

    await tx.activityLog.create({
      data: {
        action: 'UPDATED',
        entityType: 'Vendor',
        entityId: vendorId,
        entityLabel: result.name,
        description: `Vendor "${result.name}" updated`,
        performedBy,
        organizationId,
      },
    });

    return result;
  });

  logger.info('Vendor updated', { vendorId, organizationId });
  return updated;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getVendors(
  organizationId: string,
  options: PaginationInput & { search?: string; activeOnly?: boolean } = {},
): Promise<PaginatedResult<Vendor>> {
  const { page = 1, search, activeOnly = true } = options;
  const limit = Math.min(options.limit ?? 25, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.VendorWhereInput = {
    organizationId,
    ...(activeOnly ? { isActive: true } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { contactName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.vendor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function deleteVendor(organizationId: string, vendorId: string): Promise<void> {
  const existing = await prisma.vendor.findFirst({
    where: { id: vendorId, organizationId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, 'Vendor not found', 'NOT_FOUND');

  await prisma.vendor.delete({ where: { id: vendorId } });
}

export async function getVendorById(organizationId: string, vendorId: string): Promise<Vendor & {
  _count: { purchaseOrders: number };
}> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      _count: { select: { purchaseOrders: true } },
    },
  });

  if (!vendor || vendor.organizationId !== organizationId) {
    throw new AppError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');
  }

  return vendor;
}
