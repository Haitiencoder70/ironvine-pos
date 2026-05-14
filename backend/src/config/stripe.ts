import Stripe from 'stripe';
import { env } from './env';

const stripeKey = env.STRIPE_SECRET_KEY ?? (
  env.NODE_ENV === 'production'
    ? (() => { throw new Error('STRIPE_SECRET_KEY is required in production'); })()
    : 'sk_test_development_placeholder'
);

export const stripe = new Stripe(stripeKey as string, {
  apiVersion: '2025-02-24.acacia',
});

export const PRICE_IDS = {
  STARTER:    env.STRIPE_PRICE_STARTER,
  PRO:        env.STRIPE_PRICE_PRO,
  ENTERPRISE: env.STRIPE_PRICE_ENTERPRISE,
} as const;

export type PaidPlan = keyof typeof PRICE_IDS;

export const isStripeConfigured = !!env.STRIPE_SECRET_KEY;
