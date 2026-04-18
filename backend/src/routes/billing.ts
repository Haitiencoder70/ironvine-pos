import { Router } from 'express';
import express from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { authorize } from '../middleware/authorize';
import {
  checkoutHandler,
  portalHandler,
  usageHandler,
  webhookHandler,
} from '../controllers/billingController';

export const billingRouter = Router();

// Stripe webhook — raw body required for signature verification, NO auth middleware
billingRouter.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

// Authenticated billing routes
billingRouter.use(requireAuth, injectTenant);
billingRouter.get('/usage', authorize('billing:view'), usageHandler);
billingRouter.post('/checkout', authorize('billing:edit'), checkoutHandler);
billingRouter.post('/portal', authorize('billing:view'), portalHandler);
