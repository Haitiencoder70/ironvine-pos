import { Router } from 'express';

import { authorize } from '../middleware/authorize';
import {
  getSalesReportHandler,
  getInventoryReportHandler,
  getProductionReportHandler,
} from '../controllers/reportController';

export const reportsRouter = Router();

// removed redundant middleware

reportsRouter.get('/sales', authorize('reports:view'), getSalesReportHandler);
reportsRouter.get('/inventory', authorize('reports:view'), getInventoryReportHandler);
reportsRouter.get('/production', authorize('reports:view'), getProductionReportHandler);
