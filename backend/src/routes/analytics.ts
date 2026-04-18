import { Router } from 'express';
import { currentPeriodHandler, periodRangeHandler, exportHandler } from '../controllers/analyticsController';

const router = Router();

router.get('/current', currentPeriodHandler);
router.get('/range', periodRangeHandler);
router.get('/export', exportHandler);

export { router as analyticsRouter };
