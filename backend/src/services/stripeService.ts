/**
 * stripeService — full Stripe lifecycle management.
 * Core checkout/portal/webhook logic lives in billingService and is re-exported here
 * alongside additional helpers (createCustomer, upgradeSubscription, cancelSubscription).
 */
export {
  createCheckoutSession,
  createPortalSession,
  syncSubscription,
  handlePaymentFailed,
} from './billingService';

import { stripe } from '../config/stripe';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';

/**
 * Create or retrieve a Stripe customer for an org, persisting the ID.
 */
export async function createCustomer(
  organizationId: string,
  email: string,
  name: string,
): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeCustomerId: true },
  });
  if (!org) throw new AppError(404, 'Organization not found', 'ORG_NOT_FOUND');

  if (org.stripeCustomerId) return org.stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { organizationId },
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: { stripeCustomerId: customer.id },
  });

  logger.info('Stripe customer created', { organizationId, customerId: customer.id });
  return customer.id;
}

/**
 * Upgrade or downgrade the active subscription to a new price.
 * Charges are prorated immediately.
 */
export async function upgradeSubscription(
  organizationId: string,
  newPriceId: string,
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeSubscriptionId: true },
  });
  if (!org?.stripeSubscriptionId) {
    throw new AppError(400, 'No active subscription to upgrade', 'NO_SUBSCRIPTION');
  }

  const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) throw new AppError(500, 'Subscription has no line items', 'STRIPE_ERROR');

  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: 'create_prorations',
  });

  logger.info('Subscription upgraded', { organizationId, newPriceId });
}

/**
 * Cancel at period end. The org retains access until the billing cycle closes.
 */
export async function cancelSubscription(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeSubscriptionId: true },
  });
  if (!org?.stripeSubscriptionId) {
    throw new AppError(400, 'No active subscription to cancel', 'NO_SUBSCRIPTION');
  }

  const updated = await stripe.subscriptions.update(org.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionEndsAt: updated.cancel_at ? new Date(updated.cancel_at * 1000) : null,
    },
  });

  logger.info('Subscription set to cancel at period end', { organizationId });
}
