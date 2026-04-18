import { Request, Response, NextFunction } from 'express';
import { OrderStatus, OrderPriority } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  createOrder,
  updateOrderStatus,
  getOrders,
  getOrderById,
  useMaterials,
  updateOrder,
  getOrderWorkflow,
} from '../services/orderService';
import { trackEvent } from '../services/analyticsService';

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const query = authReq.query as Record<string, unknown>;

    const result = await getOrders({
      organizationId: orgDbId,
      status: query['status'] as OrderStatus | undefined,
      customerId: query['customerId'] as string | undefined,
      priority: query['priority'] as OrderPriority | undefined,
      search: query['search'] as string | undefined,
      dateFrom: query['dateFrom'] as Date | undefined,
      dateTo: query['dateTo'] as Date | undefined,
      sortKey: query['sortKey'] as string | undefined,
      sortDir: query['sortDir'] as 'asc' | 'desc' | undefined,
      page: Number(query['page'] ?? 1),
      limit: Number(query['limit'] ?? 25),
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
    const performedBy = authReq.auth.userId;

    const org = await prisma.organization.findUnique({
      where: { id: orgDbId },
      select: { orderNumberPrefix: true },
    });

    const order = await createOrder({
      organizationId: orgDbId,
      orderNumberPrefix: org?.orderNumberPrefix ?? 'ORD',
      performedBy,
      ...authReq.body,
    });

    void trackEvent(orgDbId, 'order_created', { orderId: order.id });
    res.status(201).json({ data: order });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const order = await getOrderById(orgDbId, authReq.params['id'] as string);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const order = await updateOrder({
      organizationId: orgDbId,
      orderId: authReq.params['id'] as string,
      performedBy: authReq.auth.userId,
      ...authReq.body,
    });
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const order = await updateOrderStatus({
      organizationId: orgDbId,
      orderId: authReq.params['id'] as string,
      newStatus: authReq.body.newStatus,
      notes: authReq.body.notes,
      performedBy: authReq.auth.userId,
    });
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
};

export const useMaterialsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    await useMaterials({
      organizationId: orgDbId,
      orderId: authReq.params['id'] as string,
      materials: authReq.body.materials,
      performedBy: authReq.auth.userId,
    });
    res.json({ data: null, message: 'Materials recorded successfully' });
  } catch (err) {
    next(err);
  }
};

export const getWorkflowStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;

    const order = await prisma.order.findUnique({
      where: { id: authReq.params['id'] as string },
      select: { id: true, organizationId: true, status: true },
    });

    if (!order || order.organizationId !== orgDbId) {
      return next(new AppError(404, 'Order not found', 'ORDER_NOT_FOUND'));
    }

    const workflow = getOrderWorkflow(order.status);
    res.json({ data: workflow });
  } catch (err) {
    next(err);
  }
};
