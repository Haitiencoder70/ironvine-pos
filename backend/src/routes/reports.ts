import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { authorize } from '../middleware/authorize';
import {
  getSalesReportHandler,
  getInventoryReportHandler,
  getProductionReportHandler,
} from '../controllers/reportController';

export const reportsRouter = Router();

reportsRouter.use(requireAuth, injectTenant);

reportsRouter.get('/sales', authorize('reports:view'), getSalesReportHandler);
reportsRouter.get('/inventory', authorize('reports:view'), getInventoryReportHandler);
reportsRouter.get('/production', authorize('reports:view'), getProductionReportHandler);
