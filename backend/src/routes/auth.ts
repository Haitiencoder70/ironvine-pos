import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { getMe } from '../controllers/authController';

export const authRouter = Router();

authRouter.use(requireAuth, injectTenant);

// ─── Get Current User ─────────────────────────────────────────────────────────
authRouter.get('/me', getMe);
