import { Router } from 'express';
import { authorize } from '../middleware/authorize';
import { currentPeriodHandler, periodRangeHandler, exportHandler } from '../controllers/analyticsController';

const router = Router();

router.get('/current', authorize('reports:view'), currentPeriodHandler);
router.get('/range',   authorize('reports:view'), periodRangeHandler);
router.get('/export',  authorize('reports:export'), exportHandler);

export { router as analyticsRouter };
