import { InventoryCategory } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { randomBytes } from 'node:crypto';

/**
 * Atomically increments a named counter for an organization and returns the new value.
 * Uses a database upsert + update in a transaction to prevent race conditions.
 */
async function nextSequenceValue(
  organizationId: string,
  counterKey: string,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    // Ensure the counter row exists
    await tx.sequenceCounter.upsert({
      where: { organizationId_counterKey: { organizationId, counterKey } },
      create: { organizationId, counterKey, lastValue: 0 },
      update: {},
    });

    // Atomically increment and return the new value
    const updated = await tx.sequenceCounter.update({
      where: { organizationId_counterKey: { organizationId, counterKey } },
      data: { lastValue: { increment: 1 } },
      select: { lastValue: true },
    });

    return updated.lastValue;
  });
}

/**
 * Generates a sequential order number scoped to an organization and month.
 * Format: {prefix}-{YYYYMM}-{NNNN} e.g. ORD-202401-0042
 * Thread-safe: uses an atomic database counter.
 */
export async function generateOrderNumber(
  organizationId: string,
  prefix: string = 'ORD',
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;

  const counterKey = `order:${prefix}:${yearMonth}`;
  const sequence = await nextSequenceValue(organizationId, counterKey);

  const orderNumber = `${prefix}-${yearMonth}-${String(sequence).padStart(4, '0')}`;
  logger.debug(`Generated order number: ${orderNumber}`);
  return orderNumber;
}

/**
 * Generates a sequential PO number scoped to an organization and month.
 * Format: PO-{YYYYMM}-{NNNN} e.g. PO-202401-0001
 * Thread-safe: uses an atomic database counter.
 */
export async function generatePONumber(organizationId: string): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;

  const counterKey = `po:${yearMonth}`;
  const sequence = await nextSequenceValue(organizationId, counterKey);

  const poNumber = `PO-${yearMonth}-${String(sequence).padStart(4, '0')}`;
  logger.debug(`Generated PO number: ${poNumber}`);
  return poNumber;
}

/**
 * Generates a cryptographically random invite token (64 hex chars).
 * Uses Node.js built-in crypto — compatible with Node 18+.
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generates a URL-friendly slug from a string.
 * e.g. "Acme T-Shirts" → "acme-t-shirts"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates a unique SKU for a new inventory item.
 * Format: {CATEGORY_PREFIX}-{TIMESTAMP_BASE36}-{RANDOM_HEX4}
 * e.g. BLK-M0XFQZ-A3F1
 */
export function generateSKU(category: InventoryCategory): string {
  const prefix = category
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generates a sequential shipment number scoped to an organization and month.
 * Format: SHP-{YYYYMM}-{NNNN} e.g. SHP-202401-0001
 * Thread-safe: uses an atomic database counter.
 */
export async function generateShipmentNumber(organizationId: string): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;

  const counterKey = `shipment:${yearMonth}`;
  const sequence = await nextSequenceValue(organizationId, counterKey);

  const shipmentNumber = `SHP-${yearMonth}-${String(sequence).padStart(4, '0')}`;
  logger.debug(`Generated shipment number: ${shipmentNumber}`);
  return shipmentNumber;
}

/**
 * Generates a sequential customer number scoped to an organization.
 * Format: CUST-{NNNNNN} e.g. CUST-000042 (not month-scoped — sequential per org lifetime)
 * Thread-safe: uses an atomic database counter.
 */
export async function generateCustomerNumber(organizationId: string): Promise<string> {
  const counterKey = 'customer';
  const sequence = await nextSequenceValue(organizationId, counterKey);

  const customerNumber = `CUST-${String(sequence).padStart(6, '0')}`;
  logger.debug(`Generated customer number: ${customerNumber}`);
  return customerNumber;
}
