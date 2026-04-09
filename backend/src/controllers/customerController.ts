import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { createCustomer, updateCustomer, getCustomers, getCustomerById } from '../services/customerService';

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const query = authReq.query as Record<string, unknown>;

    const result = await getCustomers(orgDbId, {
      search: query['search'] as string | undefined,
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
    const { billing, shipping, ...rest } = authReq.body as {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      company?: string;
      notes?: string;
      billing?: Record<string, string>;
      shipping?: Record<string, string>;
    };

    const customer = await createCustomer({
      organizationId: orgDbId,
      performedBy: authReq.auth.userId,
      ...rest,
      billingStreet: billing?.['street'],
      billingCity: billing?.['city'],
      billingState: billing?.['state'],
      billingZip: billing?.['zip'],
      billingCountry: billing?.['country'],
      shippingStreet: shipping?.['street'],
      shippingCity: shipping?.['city'],
      shippingState: shipping?.['state'],
      shippingZip: shipping?.['zip'],
      shippingCountry: shipping?.['country'],
    });

    res.status(201).json({ data: customer });
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const { billing, shipping, ...rest } = authReq.body as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      company?: string;
      notes?: string;
      billing?: Record<string, string>;
      shipping?: Record<string, string>;
    };

    const customer = await updateCustomer({
      organizationId: orgDbId,
      customerId: authReq.params['id'] as string,
      performedBy: authReq.auth.userId,
      ...rest,
      billingStreet: billing?.['street'],
      billingCity: billing?.['city'],
      billingState: billing?.['state'],
      billingZip: billing?.['zip'],
      billingCountry: billing?.['country'],
      shippingStreet: shipping?.['street'],
      shippingCity: shipping?.['city'],
      shippingState: shipping?.['state'],
      shippingZip: shipping?.['zip'],
      shippingCountry: shipping?.['country'],
    });

    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
};
