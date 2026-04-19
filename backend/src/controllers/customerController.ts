import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { createCustomer, updateCustomer, getCustomers, getCustomerById } from '../services/customerService';
import { trackEvent } from '../services/analyticsService';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const query = authReq.query as Record<string, unknown>;

    const result = await getCustomers(orgDbId, {
      search: query['search'] as string | undefined,
      page: Number(query['page'] ?? 1),
      limit: Number(query['limit'] ?? 25),
      sortKey: query['sortKey'] as string | undefined,
      sortDir: query['sortDir'] as 'asc' | 'desc' | undefined,
    });

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const customer = await getCustomerById(orgDbId, authReq.params['id'] as string);
    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;

    const { billing, shipping, ...rest } = req.body;

    const customer = await createCustomer({
      organizationId: orgDbId,
      performedBy: authReq.auth.userId,
      ...rest,
      billingStreet: billing?.street,
      billingCity: billing?.city,
      billingState: billing?.state,
      billingZip: billing?.zip,
      billingCountry: billing?.country,
      shippingStreet: shipping?.street,
      shippingCity: shipping?.city,
      shippingState: shipping?.state,
      shippingZip: shipping?.zip,
      shippingCountry: shipping?.country,
    });

    void trackEvent(orgDbId, 'customer_added', { customerId: customer.id });
    res.status(201).json({ data: customer });
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;

    const { billing, shipping, ...rest } = req.body;

    const customer = await updateCustomer({
      organizationId: orgDbId,
      customerId: authReq.params['id'] as string,
      performedBy: authReq.auth.userId,
      ...rest,
      billingStreet: billing?.street,
      billingCity: billing?.city,
      billingState: billing?.state,
      billingZip: billing?.zip,
      billingCountry: billing?.country,
      shippingStreet: shipping?.street,
      shippingCity: shipping?.city,
      shippingState: shipping?.state,
      shippingZip: shipping?.zip,
      shippingCountry: shipping?.country,
    });

    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const id = authReq.params['id'] as string;

    const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true, organizationId: true } });
    if (!customer || customer.organizationId !== orgDbId) throw new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');

    await prisma.customer.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getCustomerOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const id = authReq.params['id'] as string;

    const orders = await prisma.order.findMany({
      where: { organizationId: orgDbId, customerId: id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
};
