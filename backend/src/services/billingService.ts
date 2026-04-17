import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';
import { SubscriptionPlan } from '@prisma/client';

const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-02-24.acacia',
});

const PLAN_TO_PRICE_ID: Record<string, string | undefined> = {
  STARTER:    env.STRIPE_PRICE_STARTER,
  PRO:        env.STRIPE_PRICE_PRO,
  ENTERPRISE: env.STRIPE_PRICE_ENTERPRISE,
};

function priceIdToPlan(priceId: string | null | undefined): SubscriptionPlan {
  const entry = Object.entries(PLAN_TO_PRICE_ID).find(([, pid]) => pid === priceId);
  return (entry?.[0] as SubscriptionPlan) ?? SubscriptionPlan.FREE;
}

export async function createCheckoutSession(
  orgDbId: string,
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE',
  returnUrl: string,
): Promise<string> {
  const priceId = PLAN_TO_PRICE_ID[plan];
  if (!priceId || priceId.startsWith('price_placeholder')) {
    throw new AppError(503, 'Billing is not configured yet. Please add Stripe price IDs to your environment.', 'BILLING_NOT_CONFIGURED');
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgDbId },
    select: { id: true, name: true, stripeCustomerId: true },
  });
  if (!org) throw new AppError(404, 'Organization not found', 'ORG_NOT_FOUND');

  let customerId = org.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      metadata: { orgDbId },
    });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: orgDbId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?billing=success`,
    cancel_url: `${returnUrl}?billing=canceled`,
    metadata: { orgDbId },
  });

  if (!session.url) throw new AppError(500, 'Failed to create Stripe checkout session', 'STRIPE_ERROR');
  return session.url;
}

export async function createPortalSession(orgDbId: string, returnUrl: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: orgDbId },
    select: { stripeCustomerId: true },
  });
  if (!org) throw new AppError(404, 'Organization not found', 'ORG_NOT_FOUND');
  if (!org.stripeCustomerId) {
    throw new AppError(400, 'No active subscription found. Please upgrade to a paid plan first.', 'NO_SUBSCRIPTION');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function syncSubscription(stripeEvent: Stripe.Event): Promise<void> {
  let subscription: Stripe.Subscription;

  if (stripeEvent.type === 'checkout.session.completed') {
    const checkoutSession = stripeEvent.data.object as Stripe.Checkout.Session;
    if (!checkoutSession.subscription) return;
    subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription as string);
  } else if (
    stripeEvent.type === 'customer.subscription.updated' ||
    stripeEvent.type === 'customer.subscription.deleted'
  ) {
    subscription = stripeEvent.data.object as Stripe.Subscription;
  } else {
    return;
  }

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const org = await prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true, plan: true },
  });

  if (!org) {
    logger.warn('syncSubscription: no org found for Stripe customer', { customerId });
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const newPlan = subscription.status === 'canceled'
    ? SubscriptionPlan.FREE
    : priceIdToPlan(priceId);
  const prevPlan = org.plan;

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: org.id },
      data: {
        plan: newPlan,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        subscriptionEndsAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      },
    }),
    prisma.billingHistory.create({
      data: {
        organizationId: org.id,
        event: stripeEvent.type,
        fromPlan: prevPlan,
        toPlan: newPlan,
        stripeEventId: stripeEvent.id,
        metadata: { subscriptionId: subscription.id, status: subscription.status },
      },
    }),
  ]);

  logger.info('Subscription synced', { orgId: org.id, prevPlan, newPlan, status: subscription.status });
}

export async function handlePaymentFailed(stripeEvent: Stripe.Event): Promise<void> {
  const invoice = stripeEvent.data.object as Stripe.Invoice;
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : (invoice.customer as Stripe.Customer | null)?.id;

  if (!customerId) return;

  await prisma.organization.updateMany({
    where: { stripeCustomerId: customerId },
    data: { subscriptionStatus: 'past_due' },
  });

  logger.warn('Payment failed — org marked past_due', { customerId });
}
