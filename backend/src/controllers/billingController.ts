import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import {
  createCheckoutSession,
  createPortalSession,
  syncSubscription,
  handlePaymentFailed,
} from '../services/billingService';
import { checkoutSchema, portalSchema } from '../validators/billing';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { stripe } from '../config/stripe';
import { PLANS } from '../constants/plans';

export async function checkoutHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, parsed.error.message, 'VALIDATION_ERROR'));
    }

    const orgDbId = req.organizationDbId!;
    const defaultReturn = `${env.FRONTEND_URL}/settings/billing`;
    const returnUrl = parsed.data.returnUrl ?? defaultReturn;

    const url = await createCheckoutSession(orgDbId, parsed.data.plan, returnUrl);
    res.json({ url });
  } catch (error) {
    next(error);
  }
}

export async function portalHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = portalSchema.safeParse(req.body);
    const orgDbId = req.organizationDbId!;
    const defaultReturn = `${env.FRONTEND_URL}/settings/billing`;
    const returnUrl = (parsed.success && parsed.data.returnUrl) ? parsed.data.returnUrl : defaultReturn;

    const url = await createPortalSession(orgDbId, returnUrl);
    res.json({ url });
  } catch (error) {
    next(error);
  }
}

export async function usageHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;

    const [org, orderCount, customerCount, userCount, inventoryCount] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgDbId },
        select: {
          plan: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          subscriptionEndsAt: true,
          maxOrders: true,
          maxCustomers: true,
          maxUsers: true,
          maxInventoryItems: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
        },
      }),
      prisma.order.count({ where: { organizationId: orgDbId } }),
      prisma.customer.count({ where: { organizationId: orgDbId } }),
      prisma.user.count({ where: { organizationId: orgDbId } }),
      prisma.inventoryItem.count({ where: { organizationId: orgDbId } }),
    ]);

    if (!org) return next(new AppError(404, 'Organization not found', 'ORG_NOT_FOUND'));

    res.json({
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
      trialEndsAt: org.trialEndsAt,
      subscriptionEndsAt: org.subscriptionEndsAt,
      hasStripeCustomer: !!org.stripeCustomerId,
      hasStripeSubscription: !!org.stripeSubscriptionId,
      usage: {
        orders:         { current: orderCount,     max: org.maxOrders },
        customers:      { current: customerCount,  max: org.maxCustomers },
        users:          { current: userCount,      max: org.maxUsers },
        inventoryItems: { current: inventoryCount, max: org.maxInventoryItems },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function webhookHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sig = req.headers['stripe-signature'];
  const secret = env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    next(new AppError(400, 'Missing Stripe signature or webhook secret', 'WEBHOOK_ERROR'));
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch (err) {
    logger.error('Webhook signature verification failed', { err });
    next(new AppError(400, 'Webhook signature verification failed', 'WEBHOOK_SIGNATURE_ERROR'));
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event);
        break;
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          const org = await prisma.organization.findFirst({
            where: { stripeCustomerId: customerId },
            select: { id: true },
          });
          if (org) {
            const { notifyPaymentSuccess } = await import('../services/notificationService.js');
            await notifyPaymentSuccess(org.id, {
              amountCents: invoice.amount_paid ?? 0,
              invoiceUrl: invoice.hosted_invoice_url ?? undefined,
              billingDate: new Date((invoice.created ?? 0) * 1000),
            });
          }
        }
        break;
      }
      case 'invoice.payment_failed':
        await handlePaymentFailed(event);
        break;
      default:
        logger.debug('Unhandled Stripe event', { type: event.type });
    }
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}

function isStripePriceConfigured(priceId: string | null | undefined): boolean {
  return !!priceId && !priceId.startsWith('price_placeholder');
}

const PLAN_KEYS = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const;

export function plansHandler(_req: Request, res: Response): void {
  const plans = PLAN_KEYS.map((key) => {
    const plan = PLANS[key];
    return {
      key,
      label: plan.name,
      priceCents: typeof plan.price === 'number' ? plan.price * 100 : null,
      popular: key === 'PRO',
      active: true,
      stripePriceConfigured: isStripePriceConfigured(plan.stripePriceId),
      limits: {
        users: plan.limits.users,
        ordersPerMonth: plan.limits.ordersPerMonth,
        customers: plan.limits.customers,
        inventoryItems: plan.limits.inventoryItems,
      },
      features: [...plan.features],
    };
  });
  res.json(plans);
}
