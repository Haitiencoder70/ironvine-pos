import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import {
  getDashboardStats,
  getRecentOrders,
  getOrdersByStatus,
  getLowStockAlerts,
  getPendingPOs,
} from '../services/dashboardService';

export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const stats = await getDashboardStats(authReq.organizationDbId!);
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
};

export const getRecentOrdersHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orders = await getRecentOrders(authReq.organizationDbId!);
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
};

export const getOrdersByStatusHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const counts = await getOrdersByStatus(authReq.organizationDbId!);
    res.json({ data: counts });
  } catch (err) {
    next(err);
  }
};

export const getLowStockAlertsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const alerts = await getLowStockAlerts(authReq.organizationDbId!);
    res.json({ data: alerts });
  } catch (err) {
    next(err);
  }
};

export const getPendingPOsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const pos = await getPendingPOs(authReq.organizationDbId!);
    res.json({ data: pos });
  } catch (err) {
    next(err);
  }
};
