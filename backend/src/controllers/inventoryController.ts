import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../lib/prisma';
import { InventoryCategory } from '@prisma/client';
import { generateSKU } from '../utils/generators';
import {
  getInventoryItems,
  getLowStockItems,
  adjustStock,
  getInventoryItemById,
  updateInventoryItem,
  getStockMovements,
} from '../services/inventoryService';

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const query = authReq.query as Record<string, unknown>;

    const result = await getInventoryItems(orgDbId, {
      category: query['category'] as InventoryCategory | undefined,
      search: query['search'] as string | undefined,
      page: Number(query['page'] ?? 1),
      limit: Number(query['limit'] ?? 50),
    });

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const { sku, category, ...rest } = authReq.body as {
      sku?: string;
      category: InventoryCategory;
      name: string;
      costPrice: number;
      quantityOnHand?: number;
      reorderPoint?: number;
      reorderQuantity?: number;
      brand?: string;
      size?: string;
      color?: string;
      notes?: string;
    };

    const resolvedSku = sku ?? generateSKU(category);

    const item = await prisma.inventoryItem.create({
      data: {
        ...rest,
        sku: resolvedSku,
        category,
        organizationId: orgDbId,
      },
    });

    res.status(201).json({ data: item });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const item = await getInventoryItemById(orgDbId, authReq.params['id'] as string);
    res.json({ data: item });
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const item = await updateInventoryItem({
      organizationId: orgDbId,
      itemId: authReq.params['id'] as string,
      ...authReq.body,
    });
    res.json({ data: item });
  } catch (err) {
    next(err);
  }
};

export const adjustStockHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const item = await adjustStock({
      organizationId: orgDbId,
      inventoryItemId: authReq.params['id'] as string,
      quantityDelta: authReq.body.quantityDelta,
      type: authReq.body.type,
      reason: authReq.body.reason,
      orderId: authReq.body.orderId,
      performedBy: authReq.auth.userId,
    });

    res.json({ data: item });
  } catch (err) {
    next(err);
  }
};

export const getMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const query = authReq.query as Record<string, unknown>;

    const result = await getStockMovements(orgDbId, authReq.params['id'] as string, {
      page: Number(query['page'] ?? 1),
      limit: Number(query['limit'] ?? 50),
    });

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

export const getLowStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const items = await getLowStockItems({ organizationId: orgDbId });
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
};

export const deleteItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const id = authReq.params['id'] as string;

    const item = await prisma.inventoryItem.findUnique({ where: { id }, select: { id: true, organizationId: true } });
    if (!item || item.organizationId !== orgDbId) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    // Soft delete — mark as inactive
    await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
