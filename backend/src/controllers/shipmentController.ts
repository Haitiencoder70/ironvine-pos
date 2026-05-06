import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import {
  createShipment,
  updateShipmentStatus,
  getShipments,
  getShipmentById,
  updateTracking,
} from '../services/shipmentService';
import { ShipmentStatus } from '@prisma/client';

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const query = authReq.query as Record<string, unknown>;

    const result = await getShipments(orgDbId, {
      status: query['status'] as ShipmentStatus | undefined,
      orderId: query['orderId'] as string | undefined,
      page: Number(query['page'] ?? 1),
      limit: Number(query['limit'] ?? 25),
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
    const shipment = await getShipmentById(orgDbId, authReq.params['id'] as string);
    res.json({ data: shipment });
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const shipment = await createShipment({
      organizationId: orgDbId,
      performedBy: authReq.auth.userId,
      ...authReq.body,
    });

    res.status(201).json({ data: shipment });
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const shipment = await updateShipmentStatus({
      organizationId: orgDbId,
      shipmentId: authReq.params['id'] as string,
      newStatus: authReq.body.newStatus,
      trackingNumber: authReq.body.trackingNumber,
      estimatedDelivery: authReq.body.estimatedDelivery,
      notes: authReq.body.notes,
      location: authReq.body.location,
      performedBy: authReq.auth.userId,
    });

    res.json({ data: shipment });
  } catch (err) {
    next(err);
  }
};

export const updateTrackingHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    const shipment = await updateTracking({
      organizationId: orgDbId,
      shipmentId: authReq.params['id'] as string,
      carrier: authReq.body.carrier,
      trackingNumber: authReq.body.trackingNumber,
      estimatedDelivery: authReq.body.estimatedDelivery,
      sendTrackingEmail: authReq.body.sendTrackingEmail,
      performedBy: authReq.auth.userId,
    });

    res.json({ data: shipment });
  } catch (err) {
    next(err);
  }
};
