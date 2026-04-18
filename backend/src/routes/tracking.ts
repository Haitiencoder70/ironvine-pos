import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getOrderTrackingStatus } from '../controllers/trackingController';

const router = Router();

// Apply a strict rate limit for public tracking endpoints to prevent brute-force probing of CUIDs
const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 tracking requests per `window`
  message: 'Too many tracking requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/order/:id', trackingLimiter, getOrderTrackingStatus);

export { router as trackingRouter };
