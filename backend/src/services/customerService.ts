import { Prisma, Customer } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import type { PaginatedResult, PaginationInput } from '../types/services';


// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateCustomerInput {
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry?: string;
  performedBy: string;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const {
    organizationId,
    firstName,
    lastName,
    email,
    phone,
    company,
    notes,
    billingStreet,
    billingCity,
    billingState,
    billingZip,
    billingCountry,
    shippingStreet,
    shippingCity,
    shippingState,
    shippingZip,
    shippingCountry,
    performedBy,
  } = input;

  // Check for duplicate email within org
  if (email) {
    const existing = await prisma.customer.findUnique({
      where: { email_organizationId: { email, organizationId } },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(409, `A customer with email "${email}" already exists`, 'CUSTOMER_EMAIL_EXISTS');
    }
  }

  const customer = await prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        organizationId,
        firstName,
        lastName,
        email,
        phone,
        company,
        notes,
        billingStreet,
        billingCity,
        billingState,
        billingZip,
        billingCountry: billingCountry ?? 'US',
        shippingStreet,
        shippingCity,
        shippingState,
        shippingZip,
        shippingCountry: shippingCountry ?? 'US',
      },
    });

    await tx.activityLog.create({
      data: {
        action: 'CREATED',
        entityType: 'Customer',
        entityId: created.id,
        entityLabel: `${firstName} ${lastName}`,
        description: `Customer ${firstName} ${lastName} created`,
        performedBy,
        organizationId,
      },
    });

    return created;
  });

  logger.info('Customer created', { customerId: customer.id, organizationId });
  return customer;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateCustomerInput {
  organizationId: string;
  customerId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry?: string;
  performedBy: string;
}

export async function updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
  const { organizationId, customerId, performedBy, email, ...rest } = input;

  const existing = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, organizationId: true, firstName: true, lastName: true },
  });

  if (!existing || existing.organizationId !== organizationId) {
    throw new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  // Check email uniqueness within org if email is being changed
  if (email) {
    const duplicate = await prisma.customer.findUnique({
      where: { email_organizationId: { email, organizationId } },
      select: { id: true },
    });
    if (duplicate && duplicate.id !== customerId) {
      throw new AppError(409, `A customer with email "${email}" already exists`, 'CUSTOMER_EMAIL_EXISTS');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.customer.update({
      where: { id: customerId },
      data: { email, ...rest },
    });

    await tx.activityLog.create({
      data: {
        action: 'UPDATED',
        entityType: 'Customer',
        entityId: customerId,
        entityLabel: `${result.firstName} ${result.lastName}`,
        description: `Customer ${result.firstName} ${result.lastName} updated`,
        performedBy,
        organizationId,
      },
    });

    return result;
  });

  logger.info('Customer updated', { customerId, organizationId });
  return updated;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCustomers(
  organizationId: string,
  options: PaginationInput & { search?: string; sortKey?: string; sortDir?: 'asc' | 'desc' } = {},
): Promise<PaginatedResult<Customer>> {
  const { page = 1, search, sortKey = 'createdAt', sortDir = 'desc' } = options;
  const limit = Math.min(options.limit ?? 25, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {
    organizationId,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const allowedSortKeys: Record<string, Prisma.CustomerOrderByWithRelationInput> = {
    createdAt: { createdAt: sortDir },
    firstName: { firstName: sortDir },
    lastName: { lastName: sortDir },
    email: { email: sortDir },
    company: { company: sortDir },
  };

  const orderBy = allowedSortKeys[sortKey] ?? { createdAt: 'desc' as const };

  const [data, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getCustomerById(organizationId: string, customerId: string): Promise<Customer & {
  _count: { orders: number };
}> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      _count: { select: { orders: true } },
    },
  });

  if (!customer || customer.organizationId !== organizationId) {
    throw new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  return customer;
}
