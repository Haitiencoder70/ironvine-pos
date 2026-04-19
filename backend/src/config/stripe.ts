import Stripe from 'stripe';
import { env } from './env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-02-24.acacia',
});

export const PRICE_IDS = {
  STARTER:    env.STRIPE_PRICE_STARTER,
  PRO:        env.STRIPE_PRICE_PRO,
  ENTERPRISE: env.STRIPE_PRICE_ENTERPRISE,
} as const;

export type PaidPlan = keyof typeof PRICE_IDS;
