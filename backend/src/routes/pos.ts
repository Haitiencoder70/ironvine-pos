import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { getProductsHandler, completeSaleHandler, getSaleHistoryHandler } from '../controllers/posController';

export const posRouter = Router();

// All POS routes require auth + tenant resolution
posRouter.use(requireAuth, injectTenant);

// ─── Products ──────────────────────────────────────────────────────────────────
// GET /api/pos/products?search=...&category=...
posRouter.get('/products', getProductsHandler);

// ─── Complete Sale ─────────────────────────────────────────────────────────────
// POST /api/pos/sale
posRouter.post('/sale', completeSaleHandler);

// ─── Sale History ──────────────────────────────────────────────────────────────
// GET /api/pos/sales?limit=...&offset=...
posRouter.get('/sales', getSaleHistoryHandler);
