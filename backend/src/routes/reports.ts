import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import {
  getSalesReportHandler,
  getInventoryReportHandler,
  getProductionReportHandler,
} from '../controllers/reportController';

export const reportsRouter = Router();

reportsRouter.use(requireAuth, injectTenant);

reportsRouter.get('/sales', getSalesReportHandler);
reportsRouter.get('/inventory', getInventoryReportHandler);
reportsRouter.get('/production', getProductionReportHandler);
