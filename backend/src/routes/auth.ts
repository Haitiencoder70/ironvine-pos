import { Router } from 'express';

import { getMe } from '../controllers/authController';

export const authRouter = Router();

// removed redundant middleware

// ─── Get Current User ─────────────────────────────────────────────────────────
authRouter.get('/me', getMe);
