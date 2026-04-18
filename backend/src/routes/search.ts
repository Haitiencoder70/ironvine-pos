import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { globalSearchHandler } from '../controllers/searchController';

export const searchRouter = Router();

searchRouter.use(requireAuth, injectTenant);

searchRouter.get('/', globalSearchHandler);
