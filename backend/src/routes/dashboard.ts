import { Router } from 'express';
import { authorize } from '../middleware/authorize';

import {
  getStats,
  getRecentOrdersHandler,
  getWorkQueuesHandler,
  getOrdersByStatusHandler,
  getLowStockAlertsHandler,
  getPendingPOsHandler,
  getProfitStatsHandler,
  getProfitTrendHandler,
  getTopProductsHandler,
} from '../controllers/dashboardController';

export const dashboardRouter = Router();

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
dashboardRouter.get('/stats', authorize('dashboard:view'), getStats);
dashboardRouter.get('/recent-orders', authorize('dashboard:view'), getRecentOrdersHandler);
dashboardRouter.get('/work-queues', authorize('dashboard:view'), getWorkQueuesHandler);
dashboardRouter.get('/orders-by-status', authorize('dashboard:view'), getOrdersByStatusHandler);
dashboardRouter.get('/low-stock', authorize('dashboard:view'), getLowStockAlertsHandler);
dashboardRouter.get('/pending-pos', authorize('dashboard:view'), getPendingPOsHandler);
dashboardRouter.get('/profit-stats', authorize('dashboard:view'), getProfitStatsHandler);
dashboardRouter.get('/profit-trend', authorize('dashboard:view'), getProfitTrendHandler);
dashboardRouter.get('/top-products', authorize('dashboard:view'), getTopProductsHandler);
