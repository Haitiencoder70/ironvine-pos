import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import {
  createPOForOrder,
  receivePOItems,
  getPurchaseOrders,
  getPOById,
  getPOsByOrder,
  sendToVendor,
  updatePOStatus,
} from '../services/purchaseOrderService';
import { PurchaseOrderStatus } from '@prisma/client';

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const query = authReq.query as Record<string, unknown>;

    const result = await getPurchaseOrders(orgDbId, {
      status: query['status'] as PurchaseOrderStatus | undefined,
      vendorId: query['vendorId'] as string | undefined,
      page: Number(query['page'] ?? 1),
      limit: Number(query['limit'] ?? 25),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const po = await getPOById(orgDbId, authReq.params['id'] as string);
    res.json({ data: po });
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const po = await createPOForOrder({
      organizationId: orgDbId,
      performedBy: authReq.auth.userId,
      ...authReq.body,
    });

    res.status(201).json({ data: po });
  } catch (err) {
    next(err);
  }
};

export const receiveItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const result = await receivePOItems({
      organizationId: orgDbId,
      purchaseOrderId: authReq.params['id'] as string,
      receivedBy: (authReq.body.receivedBy as string | undefined) ?? authReq.auth.userId,
      notes: authReq.body.notes,
      items: authReq.body.items,
    });

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

export const sendToVendorHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const po = await sendToVendor({
      organizationId: orgDbId,
      poId: authReq.params['id'] as string,
      performedBy: authReq.auth.userId,
    });
    res.json({ data: po });
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const po = await updatePOStatus({
      organizationId: orgDbId,
      poId: authReq.params['id'] as string,
      newStatus: authReq.body.newStatus,
      notes: authReq.body.notes,
      performedBy: authReq.auth.userId,
    });
    res.json({ data: po });
  } catch (err) {
    next(err);
  }
};

export const getByOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const pos = await getPOsByOrder(authReq.organizationDbId!, authReq.params['orderId'] as string);
    res.json({ data: pos });
  } catch (err) {
    next(err);
  }
};
