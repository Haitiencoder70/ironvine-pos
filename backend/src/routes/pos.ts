import { Router } from 'express';

import { getProductsHandler, completeSaleHandler, getSaleHistoryHandler } from '../controllers/posController';

export const posRouter = Router();

// All POS routes require auth + tenant resolution
// removed redundant middleware

// ─── Products ──────────────────────────────────────────────────────────────────
// GET /api/pos/products?search=...&category=...
posRouter.get('/products', getProductsHandler);

// ─── Complete Sale ─────────────────────────────────────────────────────────────
// POST /api/pos/sale
posRouter.post('/sale', completeSaleHandler);

// ─── Sale History ──────────────────────────────────────────────────────────────
// GET /api/pos/sales?limit=...&offset=...
posRouter.get('/sales', getSaleHistoryHandler);
