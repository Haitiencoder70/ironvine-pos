import { Router } from 'express';
import express from 'express';
import { authorize } from '../middleware/authorize';
import {
  checkoutHandler,
  portalHandler,
  usageHandler,
  webhookHandler,
} from '../controllers/billingController';

// Stripe webhook — raw body required, mounted BEFORE clerkAuth in app.ts
export const billingWebhookRouter = Router();
billingWebhookRouter.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

// Authenticated billing routes — mounted AFTER clerkAuth + injectTenant + requireAuth in app.ts
export const billingRouter = Router();
billingRouter.get('/usage',    authorize('billing:view'), usageHandler);
billingRouter.post('/checkout', authorize('billing:edit'), checkoutHandler);
billingRouter.post('/portal',  authorize('billing:view'), portalHandler);
