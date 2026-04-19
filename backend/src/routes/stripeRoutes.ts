import { Router } from 'express';
import express from 'express';
import {
  createCheckout,
  createPortal,
  webhook,
} from '../controllers/stripeController';

export const stripeRouter = Router();

// Stripe webhook — raw body required, no auth
stripeRouter.post('/webhook', express.raw({ type: 'application/json' }), webhook);

// Authenticated routes
// removed redundant middleware
stripeRouter.post('/create-checkout', createCheckout);
stripeRouter.post('/create-portal', createPortal);
