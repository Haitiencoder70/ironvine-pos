import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import {
  getDashboardStats,
  getRecentOrders,
  getOrdersByStatus,
  getLowStockAlerts,
  getPendingPOs,
  getProfitStats,
  getProfitTrend,
  getTopProducts,
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

export const getProfitStatsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const stats = await getProfitStats(authReq.organizationDbId!, start, end);
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
};

export const getProfitTrendHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const months = parseInt((req.query.months as string) ?? '6', 10);
    const trend = await getProfitTrend(authReq.organizationDbId!, Math.min(Math.max(months, 1), 24));
    res.json({ data: trend });
  } catch (err) {
    next(err);
  }
};

export const getTopProductsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const products = await getTopProducts(authReq.organizationDbId!, start, end);
    res.json({ data: products });
  } catch (err) {
    next(err);
  }
};
