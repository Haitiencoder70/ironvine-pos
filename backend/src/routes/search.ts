import { Router } from 'express';
import { authorize } from '../middleware/authorize';

import { globalSearchHandler } from '../controllers/searchController';

export const searchRouter = Router();

searchRouter.get('/', authorize('catalog:search'), globalSearchHandler);
