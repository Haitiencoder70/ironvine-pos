import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import {
  getStats,
  getRecentOrdersHandler,
  getOrdersByStatusHandler,
  getLowStockAlertsHandler,
  getPendingPOsHandler,
  getProfitStatsHandler,
  getProfitTrendHandler,
  getTopProductsHandler,
} from '../controllers/dashboardController';

export const dashboardRouter = Router();

// All dashboard routes require auth + tenant
dashboardRouter.use(requireAuth, injectTenant);

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
dashboardRouter.get('/stats', getStats);
dashboardRouter.get('/recent-orders', getRecentOrdersHandler);
dashboardRouter.get('/orders-by-status', getOrdersByStatusHandler);
dashboardRouter.get('/low-stock', getLowStockAlertsHandler);
dashboardRouter.get('/pending-pos', getPendingPOsHandler);
dashboardRouter.get('/profit-stats', getProfitStatsHandler);
dashboardRouter.get('/profit-trend', getProfitTrendHandler);
dashboardRouter.get('/top-products', getTopProductsHandler);
