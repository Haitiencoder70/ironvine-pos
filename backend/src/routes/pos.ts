import { Router } from 'express';

import { authorize } from '../middleware/authorize';
import { getProductsHandler, completeSaleHandler, getSaleHistoryHandler } from '../controllers/posController';

export const posRouter = Router();

// ─── Products ──────────────────────────────────────────────────────────────────
posRouter.get('/products', authorize('pos:view'), getProductsHandler);

// ─── Complete Sale ─────────────────────────────────────────────────────────────
posRouter.post('/sale', authorize('pos:create'), completeSaleHandler);

// ─── Sale History ──────────────────────────────────────────────────────────────
posRouter.get('/sales', authorize('pos:view'), getSaleHistoryHandler);
