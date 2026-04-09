import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { createVendor, updateVendor, getVendors, getVendorById } from '../services/vendorService';

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const query = authReq.query as Record<string, unknown>;

    const result = await getVendors(orgDbId, {
      search: query['search'] as string | undefined,
      activeOnly: query['activeOnly'] !== 'false',
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
    const vendor = await getVendorById(orgDbId, authReq.params['id'] as string);
    res.json({ data: vendor });
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const vendor = await createVendor({
      organizationId: orgDbId,
      performedBy: authReq.auth.userId,
      ...authReq.body,
    });

    res.status(201).json({ data: vendor });
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const vendor = await updateVendor({
      organizationId: orgDbId,
      vendorId: authReq.params['id'] as string,
      performedBy: authReq.auth.userId,
      ...authReq.body,
    });

    res.json({ data: vendor });
  } catch (err) {
    next(err);
  }
};
