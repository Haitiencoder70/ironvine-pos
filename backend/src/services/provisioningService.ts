import Stripe from 'stripe';
import { Resend } from 'resend';
import { SubscriptionPlan } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { createOrganization, getOrganizationUsage } from './organizationService';

const resend = new Resend(process.env['RESEND_API_KEY'] ?? 're_dummy_key');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProvisionInput {
  clerkOrgId:       string;
  slug:             string;
  name:             string;
  ownerClerkUserId: string;
  ownerEmail:       string;
  ownerFirstName:   string;
  ownerLastName:    string;
  plan?:            SubscriptionPlan;
}

// ─── Default product categories for T-shirt printing shops ───────────────────

const DEFAULT_CATEGORIES = [
  { name: 'Screen Print',        icon: '🖨️',  displayOrder: 1 },
  { name: 'DTF Transfer',        icon: '🔥',  displayOrder: 2 },
  { name: 'Heat Transfer Vinyl', icon: '✂️',  displayOrder: 3 },
  { name: 'Embroidery',          icon: '🧵',  displayOrder: 4 },
  { name: 'Sublimation',         icon: '🌈',  displayOrder: 5 },
  { name: 'Direct-to-Garment',   icon: '👕',  displayOrder: 6 },
  { name: 'Blank Garment',       icon: '📦',  displayOrder: 7 },
  { name: 'Accessories',         icon: '🎒',  displayOrder: 8 },
] as const;

// ─── Plan limit maps ──────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<SubscriptionPlan, {
  maxUsers: number; maxOrders: number; maxInventoryItems: number; maxCustomers: number; storageLimit: number;
}> = {
  FREE:       { maxUsers: 1,  maxOrders: 100,  maxInventoryItems: 500,   maxCustomers: 100,  storageLimit: 524_288_000      }, // 500 MB
  STARTER:    { maxUsers: 3,  maxOrders: 1000, maxInventoryItems: 2000,  maxCustomers: 500,  storageLimit: 2_147_483_648    }, // 2 GB
  PRO:        { maxUsers: 10, maxOrders: 5000, maxInventoryItems: 5000,  maxCustomers: 2000, storageLimit: 10_737_418_240   }, // 10 GB
  ENTERPRISE: { maxUsers: -1, maxOrders: -1,   maxInventoryItems: -1,    maxCustomers: -1,   storageLimit: -1               }, // unlimited
};

const VALID_UPGRADES: Record<SubscriptionPlan, SubscriptionPlan[]> = {
  FREE:       ['STARTER', 'PRO', 'ENTERPRISE'],
  STARTER:    ['PRO', 'ENTERPRISE'],
  PRO:        ['ENTERPRISE'],
  ENTERPRISE: [],
};

const VALID_DOWNGRADES: Record<SubscriptionPlan, SubscriptionPlan[]> = {
  FREE:       [],
  STARTER:    ['FREE'],
  PRO:        ['STARTER', 'FREE'],
  ENTERPRISE: ['PRO', 'STARTER', 'FREE'],
};

// ─── Email helpers ────────────────────────────────────────────────────────────

async function sendWelcomeEmail(to: string, firstName: string, orgName: string, slug: string): Promise<void> {
  const dashboardUrl = `${env.FRONTEND_URL}/dashboard`;
  const html = `
<!DOCTYPE html><html><head><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:40px 20px}
.c{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden}
.h{background:#2563eb;padding:36px 40px;text-align:center}
.h h1{color:#fff;margin:0;font-size:24px;font-weight:700}
.b{padding:40px;color:#374151;font-size:15px;line-height:1.7}
.step{background:#f0f9ff;border-left:4px solid #2563eb;padding:12px 16px;margin:12px 0;border-radius:0 6px 6px 0}
.btn{display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;margin-top:28px}
.f{text-align:center;padding:16px 40px;color:#9ca3af;font-size:13px;border-top:1px solid #f3f4f6}
</style></head><body>
<div class="c">
  <div class="h"><h1>Welcome to Ironvine POS!</h1></div>
  <div class="b">
    <p>Hi ${firstName},</p>
    <p>Your workspace <strong>${orgName}</strong> is ready. Here's how to get started:</p>
    <div class="step">📦 <strong>Step 1:</strong> Add your inventory items in the Inventory section.</div>
    <div class="step">👥 <strong>Step 2:</strong> Import or create your first customers.</div>
    <div class="step">🛒 <strong>Step 3:</strong> Create your first order and watch it flow through production.</div>
    <div class="step">⚙️ <strong>Step 4:</strong> Customise your settings (tax rate, branding, notifications).</div>
    <div style="text-align:center"><a href="${dashboardUrl}" class="btn">Go to Dashboard →</a></div>
  </div>
  <div class="f">Ironvine POS · Your workspace: ${slug}.ironvine.com</div>
</div>
</body></html>`;

  try {
    await resend.emails.send({
      from:    'welcome@ironvine.com',
      to,
      subject: `Your Ironvine POS workspace is ready — ${orgName}`,
      html,
    });
  } catch (err) {
    logger.error('Failed to send provisioning welcome email', { err, to });
  }
}

async function sendPlanChangeEmail(to: string, orgName: string, oldPlan: string, newPlan: string, isUpgrade: boolean): Promise<void> {
  const subject = isUpgrade
    ? `You've upgraded to the ${newPlan} plan — ${orgName}`
    : `Plan changed to ${newPlan} — ${orgName}`;

  const html = `
<!DOCTYPE html><html><head><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:40px 20px}
.c{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden}
.h{background:${isUpgrade ? '#16a34a' : '#6b7280'};padding:30px 40px;text-align:center}
.h h1{color:#fff;margin:0;font-size:22px;font-weight:600}
.b{padding:36px 40px;color:#374151;font-size:15px;line-height:1.6}
.badge{display:inline-block;background:#f3f4f6;border-radius:6px;padding:4px 12px;font-weight:600;font-size:14px}
.f{text-align:center;padding:16px 40px;color:#9ca3af;font-size:13px;border-top:1px solid #f3f4f6}
</style></head><body>
<div class="c">
  <div class="h"><h1>${isUpgrade ? '🎉 Plan Upgraded' : 'Plan Updated'}</h1></div>
  <div class="b">
    <p>Hi,</p>
    <p>The subscription for <strong>${orgName}</strong> has changed.</p>
    <p>
      <span class="badge">${oldPlan}</span>
      &nbsp;→&nbsp;
      <span class="badge" style="background:${isUpgrade ? '#dcfce7' : '#fee2e2'}">${newPlan}</span>
    </p>
    <p>Your new limits are now active. Visit the <a href="${env.FRONTEND_URL}/settings/billing">Billing page</a> to view your current usage.</p>
    ${isUpgrade ? '<p>Thank you for supporting Ironvine POS! 🙏</p>' : ''}
  </div>
  <div class="f">Ironvine POS Billing</div>
</div>
</body></html>`;

  try {
    await resend.emails.send({ from: 'billing@ironvine.com', to, subject, html });
  } catch (err) {
    logger.error('Failed to send plan change email', { err, to });
  }
}

// ─── provisionNewOrganization ─────────────────────────────────────────────────

export async function provisionNewOrganization(input: ProvisionInput): Promise<{ organizationId: string; userId: string }> {
  const { organization, owner } = await createOrganization({
    clerkOrgId:       input.clerkOrgId,
    name:             input.name,
    slug:             input.slug,
    ownerClerkUserId: input.ownerClerkUserId,
    ownerEmail:       input.ownerEmail,
    ownerFirstName:   input.ownerFirstName,
    ownerLastName:    input.ownerLastName,
    plan:             input.plan ?? 'FREE',
  });

  const orgId = organization.id;

  // Seed default product categories
  await prisma.productCategory.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({
      organizationId: orgId,
      name:           cat.name,
      icon:           cat.icon,
      displayOrder:   cat.displayOrder,
      isActive:       true,
    })),
    skipDuplicates: true,
  });

  logger.info('Default categories provisioned', { orgId, count: DEFAULT_CATEGORIES.length });

  // Send welcome email (non-fatal)
  await sendWelcomeEmail(input.ownerEmail, input.ownerFirstName, input.name, input.slug);

  logger.info('Organisation provisioned', { orgId, slug: input.slug });
  return { organizationId: orgId, userId: owner.id };
}

// ─── upgradeOrganization ──────────────────────────────────────────────────────

export async function upgradeOrganization(
  orgDbId:    string,
  newPlan:    SubscriptionPlan,
  performedBy: string,
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where:  { id: orgDbId },
    select: { id: true, name: true, plan: true, stripeSubscriptionId: true, stripeCustomerId: true,
              users: { where: { isActive: true }, select: { email: true } } },
  });
  if (!org) throw new AppError(404, 'Organisation not found.', 'ORG_NOT_FOUND');

  const currentPlan = org.plan;
  if (currentPlan === newPlan) {
    throw new AppError(400, `Organisation is already on the ${newPlan} plan.`, 'SAME_PLAN');
  }

  if (!VALID_UPGRADES[currentPlan].includes(newPlan)) {
    throw new AppError(
      400,
      `Cannot upgrade from ${currentPlan} to ${newPlan}. Valid targets: ${VALID_UPGRADES[currentPlan].join(', ') || 'none'}.`,
      'INVALID_UPGRADE',
    );
  }

  const limits = PLAN_LIMITS[newPlan];

  // Update Stripe subscription if applicable
  if (org.stripeSubscriptionId && env.STRIPE_SECRET_KEY) {
    const priceMap: Partial<Record<SubscriptionPlan, string | undefined>> = {
      STARTER:    env.STRIPE_PRICE_STARTER,
      PRO:        env.STRIPE_PRICE_PRO,
      ENTERPRISE: env.STRIPE_PRICE_ENTERPRISE,
    };
    const priceId = priceMap[newPlan];

    if (priceId) {
      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
        const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
        const itemId = subscription.items.data[0]?.id;
        if (itemId) {
          await stripe.subscriptions.update(org.stripeSubscriptionId, {
            items:             [{ id: itemId, price: priceId }],
            proration_behavior: 'create_prorations',
          });
        }
      } catch (err) {
        logger.error('Stripe upgrade failed', { err, orgId: orgDbId });
        throw new AppError(502, 'Failed to update Stripe subscription. Please try again.', 'STRIPE_ERROR');
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: orgDbId },
      data:  { plan: newPlan, ...limits },
    });

    await tx.activityLog.create({
      data: {
        action:        'UPDATED',
        entityType:    'Organization',
        entityId:      orgDbId,
        entityLabel:   org.name,
        description:   `Plan upgraded from ${currentPlan} to ${newPlan}`,
        performedBy,
        organizationId: orgDbId,
      },
    });
  });

  // Notify owner (non-fatal)
  const ownerEmail = org.users[0]?.email;
  if (ownerEmail) await sendPlanChangeEmail(ownerEmail, org.name, currentPlan, newPlan, true);

  logger.info('Organisation upgraded', { orgId: orgDbId, from: currentPlan, to: newPlan });
}

// ─── downgradeOrganization ────────────────────────────────────────────────────

export async function downgradeOrganization(
  orgDbId:    string,
  newPlan:    SubscriptionPlan,
  performedBy: string,
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where:  { id: orgDbId },
    select: { id: true, name: true, plan: true, stripeSubscriptionId: true,
              users: { where: { isActive: true }, select: { email: true } } },
  });
  if (!org) throw new AppError(404, 'Organisation not found.', 'ORG_NOT_FOUND');

  const currentPlan = org.plan;
  if (currentPlan === newPlan) {
    throw new AppError(400, `Organisation is already on the ${newPlan} plan.`, 'SAME_PLAN');
  }

  if (!VALID_DOWNGRADES[currentPlan].includes(newPlan)) {
    throw new AppError(
      400,
      `Cannot downgrade from ${currentPlan} to ${newPlan}.`,
      'INVALID_DOWNGRADE',
    );
  }

  // Check that current usage fits within the target plan's limits
  const targetLimits = PLAN_LIMITS[newPlan];
  const usage        = await getOrganizationUsage(orgDbId);

  const violations: string[] = [];

  if (targetLimits.maxUsers !== -1 && usage.users.current > targetLimits.maxUsers)
    violations.push(`users (${usage.users.current} > ${targetLimits.maxUsers})`);
  if (targetLimits.maxOrders !== -1 && usage.orders.current > targetLimits.maxOrders)
    violations.push(`orders (${usage.orders.current} > ${targetLimits.maxOrders})`);
  if (targetLimits.maxInventoryItems !== -1 && usage.inventoryItems.current > targetLimits.maxInventoryItems)
    violations.push(`inventory items (${usage.inventoryItems.current} > ${targetLimits.maxInventoryItems})`);
  if (targetLimits.maxCustomers !== -1 && usage.customers.current > targetLimits.maxCustomers)
    violations.push(`customers (${usage.customers.current} > ${targetLimits.maxCustomers})`);
  if (targetLimits.storageLimit !== -1 && usage.storage.currentBytes > targetLimits.storageLimit)
    violations.push(`storage (${Math.round(usage.storage.currentBytes / 1024 / 1024)} MB > ${Math.round(targetLimits.storageLimit / 1024 / 1024)} MB)`);

  if (violations.length > 0) {
    throw new AppError(
      409,
      `Cannot downgrade to ${newPlan}: current usage exceeds the plan limits for ${violations.join(', ')}. ` +
        'Please reduce usage before downgrading.',
      'USAGE_EXCEEDS_PLAN',
    );
  }

  // Update Stripe subscription if applicable
  if (org.stripeSubscriptionId && env.STRIPE_SECRET_KEY) {
    const priceMap: Partial<Record<SubscriptionPlan, string | undefined>> = {
      STARTER: env.STRIPE_PRICE_STARTER,
      PRO:     env.STRIPE_PRICE_PRO,
    };
    const priceId = priceMap[newPlan];

    if (priceId) {
      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
        const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
        const itemId = subscription.items.data[0]?.id;
        if (itemId) {
          await stripe.subscriptions.update(org.stripeSubscriptionId, {
            items:             [{ id: itemId, price: priceId }],
            proration_behavior: 'create_prorations',
          });
        }
      } catch (err) {
        logger.error('Stripe downgrade failed', { err, orgId: orgDbId });
        throw new AppError(502, 'Failed to update Stripe subscription. Please try again.', 'STRIPE_ERROR');
      }
    } else if (newPlan === 'FREE') {
      // Cancels at period end on downgrade to free
      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
        await stripe.subscriptions.update(org.stripeSubscriptionId, { cancel_at_period_end: true });
      } catch (err) {
        logger.error('Stripe cancel-at-period-end failed', { err, orgId: orgDbId });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: orgDbId },
      data:  { plan: newPlan, ...targetLimits },
    });

    await tx.activityLog.create({
      data: {
        action:        'UPDATED',
        entityType:    'Organization',
        entityId:      orgDbId,
        entityLabel:   org.name,
        description:   `Plan downgraded from ${currentPlan} to ${newPlan}`,
        performedBy,
        organizationId: orgDbId,
      },
    });
  });

  const ownerEmail = org.users[0]?.email;
  if (ownerEmail) await sendPlanChangeEmail(ownerEmail, org.name, currentPlan, newPlan, false);

  logger.info('Organisation downgraded', { orgId: orgDbId, from: currentPlan, to: newPlan });
}
