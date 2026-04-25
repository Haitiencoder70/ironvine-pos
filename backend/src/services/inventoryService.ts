import { Prisma, InventoryItem, StockMovementType, InventoryCategory } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { emitToOrg } from '../lib/socket';
import { getCurrentOrganizationId } from '../utils/tenantContext';
import { AppError } from '../middleware/errorHandler';
import { sendLowStockAlertEmail } from './notificationService';
import type {
  ReserveMaterialsInput,
  AdjustStockInput,
  GetLowStockInput,
  PaginatedResult,
  PaginationInput,
} from '../types/services';

// ─── Queries ──────────────────────────────────────────────────────────────────

export type InventoryItemWithAvailability = InventoryItem & {
  quantityAvailable: number;
};

export async function getInventoryItems(
  organizationId: string,
  options: PaginationInput & {
    category?: InventoryCategory;
    search?: string;
  } = {},
): Promise<PaginatedResult<InventoryItemWithAvailability>> {
  const { page = 1, category, search } = options;
  const limit = Math.min(options.limit ?? 50, 200);
  const skip = (page - 1) * limit;

  const where: Prisma.InventoryItemWhereInput = {
    organizationId,
    isActive: true,
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.inventoryItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  const dataWithAvailability: InventoryItemWithAvailability[] = data.map((item) => ({
    ...item,
    quantityAvailable: Math.max(0, item.quantityOnHand - item.quantityReserved),
  }));

  return { data: dataWithAvailability, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getLowStockItems(input: GetLowStockInput): Promise<InventoryItem[]> {
  const { organizationId, category } = input;

  return prisma.$queryRaw<InventoryItem[]>`
    SELECT * FROM inventory_items
    WHERE "organizationId" = ${organizationId}
      AND "isActive" = true
      AND "quantityOnHand" <= "reorderPoint"
      ${category ? Prisma.sql`AND category = ${category}::"InventoryCategory"` : Prisma.empty}
    ORDER BY name ASC
  `;
}

export function getAvailableQuantity(item: {
  quantityOnHand: number;
  quantityReserved: number;
}): number {
  return Math.max(0, item.quantityOnHand - item.quantityReserved);
}

// ─── Stock Adjustments ────────────────────────────────────────────────────────

export async function adjustStock(input: AdjustStockInput): Promise<InventoryItem> {
  const { organizationId, inventoryItemId, quantityDelta, type, reason, orderId, performedBy } =
    input;

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: { id: true, organizationId: true, quantityOnHand: true, quantityReserved: true, name: true },
    });

    if (!item) {
      throw new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND');
    }

    if (item.organizationId !== organizationId) {
      throw new AppError(403, 'Access denied', 'FORBIDDEN');
    }

    const newQuantity = item.quantityOnHand + quantityDelta;
    if (newQuantity < 0) {
      throw new AppError(
        400,
        `Insufficient stock for "${item.name}". On hand: ${item.quantityOnHand}, requested removal: ${Math.abs(quantityDelta)}`,
        'INSUFFICIENT_STOCK',
      );
    }

    if (newQuantity < item.quantityReserved) {
      throw new AppError(
        400,
        `Cannot reduce "${item.name}" stock to ${newQuantity} — ${item.quantityReserved} units are reserved`,
        'STOCK_BELOW_RESERVED',
      );
    }

    const [updated] = await Promise.all([
      tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantityOnHand: newQuantity },
      }),
      tx.stockMovement.create({
        data: {
          inventoryItemId,
          type,
          quantity: quantityDelta,
          reason: reason ? `${performedBy}: ${reason}` : performedBy,
          orderId,
          organizationId,
        },
      }),
    ]);

    // Emit a low-stock event if the stock falls below the reorder point
    if (updated.quantityOnHand <= updated.reorderPoint) {
      emitToOrg(getCurrentOrganizationId(), 'inventory:low-stock', updated);
      void sendLowStockAlertEmail(organizationId, updated.name, updated.quantityOnHand, updated.reorderPoint);
    }

    logger.info('Stock adjusted', {
      inventoryItemId,
      type,
      delta: quantityDelta,
      newQuantity,
      performedBy,
    });

    return updated;
  });
}

// ─── Reservation ──────────────────────────────────────────────────────────────

export async function reserveMaterials(input: ReserveMaterialsInput): Promise<InventoryItem> {
  const { organizationId, inventoryItemId, quantity, orderId, performedBy } = input;

  if (quantity <= 0) {
    throw new AppError(400, 'Quantity must be positive', 'INVALID_QUANTITY');
  }

  return prisma.$transaction(async (tx) => {
    // Lock the row to prevent concurrent over-reservation
    const rows = await tx.$queryRaw<
      Array<{ id: string; organizationId: string; quantityOnHand: number; quantityReserved: number; name: string }>
    >`
      SELECT id, "organizationId", "quantityOnHand", "quantityReserved", name
      FROM inventory_items
      WHERE id = ${inventoryItemId}
        AND "organizationId" = ${organizationId}
      FOR UPDATE
    `;

    const item = rows[0];

    if (!item) {
      throw new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND');
    }

    if (item.organizationId !== organizationId) {
      throw new AppError(403, 'Access denied', 'FORBIDDEN');
    }

    const available = getAvailableQuantity(item);
    if (available < quantity) {
      throw new AppError(
        400,
        `Cannot reserve ${quantity} of "${item.name}". Available: ${available}`,
        'INSUFFICIENT_STOCK',
      );
    }

    const [updated] = await Promise.all([
      tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantityReserved: { increment: quantity } },
      }),
      tx.stockMovement.create({
        data: {
          inventoryItemId,
          type: StockMovementType.RESERVED,
          quantity,
          reason: performedBy,
          orderId,
          organizationId,
        },
      }),
    ]);

    return updated;
  });
}

export async function unreserveMaterials(input: ReserveMaterialsInput): Promise<InventoryItem> {
  const { organizationId, inventoryItemId, quantity, orderId, performedBy } = input;

  if (quantity <= 0) {
    throw new AppError(400, 'Quantity must be positive', 'INVALID_QUANTITY');
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: {
        id: true,
        organizationId: true,
        quantityReserved: true,
        name: true,
      },
    });

    if (!item) {
      throw new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND');
    }

    if (item.organizationId !== organizationId) {
      throw new AppError(403, 'Access denied', 'FORBIDDEN');
    }

    const toUnreserve = Math.min(quantity, item.quantityReserved);

    if (toUnreserve < quantity) {
      logger.warn('unreserveMaterials: requested quantity exceeds reserved amount, clamping', {
        inventoryItemId,
        requested: quantity,
        actual: toUnreserve,
      });
    }

    const [updated] = await Promise.all([
      tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantityReserved: { decrement: toUnreserve } },
      }),
      tx.stockMovement.create({
        data: {
          inventoryItemId,
          type: StockMovementType.UNRESERVED,
          quantity: toUnreserve,
          reason: performedBy,
          orderId,
          organizationId,
        },
      }),
    ]);

    return updated;
  });
}

// ─── Receive Stock ────────────────────────────────────────────────────────────

export async function receiveStock(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string;
    inventoryItemId: string;
    quantity: number;
    orderId?: string;
    performedBy: string;
  },
): Promise<InventoryItem> {
  const { organizationId, inventoryItemId, quantity, orderId, performedBy } = params;

  if (quantity <= 0) {
    throw new AppError(400, 'Quantity must be positive', 'INVALID_QUANTITY');
  }

  const item = await tx.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    select: { id: true, organizationId: true },
  });

  if (!item) {
    throw new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND');
  }

  if (item.organizationId !== organizationId) {
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
  }

  const [updated] = await Promise.all([
    tx.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { quantityOnHand: { increment: quantity } },
    }),
    tx.stockMovement.create({
      data: {
        inventoryItemId,
        type: StockMovementType.IN,
        quantity,
        reason: performedBy,
        orderId,
        organizationId,
      },
    }),
  ]);

  return updated;
}

// ─── Get / Update Individual Items ────────────────────────────────────────────

export async function getInventoryItemById(
  organizationId: string,
  itemId: string,
): Promise<InventoryItemWithAvailability> {
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });

  if (!item || item.organizationId !== organizationId) {
    throw new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND');
  }

  return {
    ...item,
    quantityAvailable: Math.max(0, item.quantityOnHand - item.quantityReserved),
  };
}

export interface UpdateInventoryItemInput {
  organizationId: string;
  itemId: string;
  name?: string;
  category?: InventoryCategory;
  brand?: string;
  size?: string;
  color?: string;
  reorderPoint?: number;
  reorderQuantity?: number;
  costPrice?: number;
  notes?: string;
  isActive?: boolean;
}

export async function updateInventoryItem(input: UpdateInventoryItemInput): Promise<InventoryItem> {
  const { organizationId, itemId, ...updates } = input;

  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    select: { id: true, organizationId: true },
  });

  if (!item || item.organizationId !== organizationId) {
    throw new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND');
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: updates,
  });

  logger.info('Inventory item updated', { itemId, organizationId });
  return updated;
}

// ─── Stock Movement History ───────────────────────────────────────────────────

export async function getStockMovements(
  organizationId: string,
  inventoryItemId: string,
  options: PaginationInput = {},
): Promise<PaginatedResult<Awaited<ReturnType<typeof prisma.stockMovement.findMany>>[number]>> {
  const { page = 1 } = options;
  const limit = Math.min(options.limit ?? 50, 200);
  const skip = (page - 1) * limit;

  const where = { organizationId, inventoryItemId };

  const [data, total] = await prisma.$transaction([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}
