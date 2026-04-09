import { Router } from 'express';
import { injectTenant } from '../middleware/tenant';
import {
  getSalesReportHandler,
  getInventoryReportHandler,
  getProductionReportHandler,
} from '../controllers/reportController';

export const reportsRouter = Router();

reportsRouter.use(injectTenant);

reportsRouter.get('/sales', getSalesReportHandler);
reportsRouter.get('/inventory', getInventoryReportHandler);
reportsRouter.get('/production', getProductionReportHandler);
