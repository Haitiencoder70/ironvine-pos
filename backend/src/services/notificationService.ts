import { Resend } from 'resend';
import twilio from 'twilio';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { getFromAddress, DEFAULT_FROM_ADDRESS } from '../lib/resend';

const resend = new Resend(process.env['RESEND_API_KEY'] ?? 're_dummy_key');
const twilioClient = process.env['TWILIO_ACCOUNT_SID']
  ? twilio(process.env['TWILIO_ACCOUNT_SID'], process.env['TWILIO_AUTH_TOKEN'])
  : null;
const TWILIO_PHONE_NUMBER = process.env['TWILIO_PHONE_NUMBER'] ?? '+15550000000';

/**
 * Validates if a specific module is enabled for an organization
 */
async function isModuleEnabled(organizationId: string, moduleName: 'EMAIL' | 'SMS'): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { enabledModules: true },
  });
  return org?.enabledModules?.includes(moduleName) ?? false;
}

async function getOrgFromAddress(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { emailFromName: true, emailFromAddress: true },
  });
  return org ? getFromAddress(org) : DEFAULT_FROM_ADDRESS;
}

// ─── EMAIL TEMPLATES ────────────────────────────────────────────────────────────

function emailWrapper(title: string, body: string, btnText?: string, btnUrl?: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #2563eb; padding: 30px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 40px; color: #374151; font-size: 16px; line-height: 1.6; }
    .content strong { color: #111827; font-weight: 600; }
    .btn-container { text-align: center; margin-top: 30px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 15px; }
    .footer { text-align: center; padding: 20px 40px; color: #9ca3af; font-size: 13px; border-top: 1px solid #f3f4f6; background: #fafafa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${body}
      ${btnText && btnUrl ? `<div class="btn-container"><a href="${btnUrl}" class="btn">${btnText}</a></div>` : ''}
    </div>
    <div class="footer">
      Powered by PrintFlow POS
    </div>
  </div>
</body>
</html>
  `;
}

// ─── EMAIL AUTOMATIONS ────────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(organizationId: string, customerEmail: string, orderNumber: string) {
  if (!(await isModuleEnabled(organizationId, 'EMAIL'))) return;
  if (!customerEmail) return;

  const html = emailWrapper(
    'Order Received!',
    `<p>Hello,</p>
     <p>Thank you for your order! We've successfully received your order <strong>#${orderNumber}</strong> and our team is currently reviewing it.</p>
     <p>You will receive another update as soon as the order moves into production.</p>`
  );

  try {
    await resend.emails.send({
      from: await getOrgFromAddress(organizationId),
      to: customerEmail,
      subject: `Order Confirmation: ${orderNumber}`,
      html,
    });
    logger.info(`Sent Order Confirmation Email to ${customerEmail}`);
  } catch (err) {
    logger.error(`Failed to send email to ${customerEmail}`, err);
  }
}

export async function sendOrderStatusEmail(organizationId: string, customerEmail: string, orderNumber: string, status: string) {
  if (!(await isModuleEnabled(organizationId, 'EMAIL'))) return;
  if (!customerEmail) return;

  const ST_LABELS: Record<string, string> = {
    QUOTE: 'Quote', PENDING_APPROVAL: 'Pending Approval', APPROVED: 'Approved',
    MATERIALS_ORDERED: 'Materials Ordered', MATERIALS_RECEIVED: 'Materials Received',
    IN_PRODUCTION: 'In Production', QUALITY_CHECK: 'Quality Check',
    READY_TO_SHIP: 'Ready to Ship', SHIPPED: 'Shipped', DELIVERED: 'Delivered',
    COMPLETED: 'Completed', CANCELLED: 'Cancelled', ON_HOLD: 'On Hold',
  };

  const niceStatus = ST_LABELS[status] || status;

  const html = emailWrapper(
    'Status Update',
    `<p>Hello,</p>
     <p>Your order <strong>#${orderNumber}</strong> has advanced to a new status:</p>
     <div style="background: #f3f4f6; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
       <strong style="color: #2563eb; font-size: 18px;">${niceStatus}</strong>
     </div>
     <p>If you have any questions, feel free to contact our support team.</p>`
  );

  try {
    await resend.emails.send({
      from: await getOrgFromAddress(organizationId),
      to: customerEmail,
      subject: `Order Update: ${orderNumber} is ${niceStatus}`,
      html,
    });
    logger.info(`Sent Order Status Email to ${customerEmail}`);
  } catch (err) {
    logger.error(`Failed to send status email to ${customerEmail}`, err);
  }
}

export async function sendLowStockAlertEmail(organizationId: string, itemName: string, quantity: number, reorderPoint: number) {
  if (!(await isModuleEnabled(organizationId, 'EMAIL'))) return;

  const settings = await prisma.notificationSetting.findUnique({
    where: { organizationId },
    select: { recipients: true, lowStockEmail: true }
  });

  if (!settings?.lowStockEmail) return;

  const owners = await prisma.user.findMany({
    where: { organizationId, role: 'OWNER' },
    select: { email: true }
  });

  const targets = (settings?.recipients && settings.recipients.length > 0)
    ? settings.recipients
    : owners.map(o => o.email);

  if (targets.length === 0) return;

  const html = emailWrapper(
    'Critical Stock Alert',
    `<p>Inventory Alert,</p>
     <p>The inventory level for <strong>${itemName}</strong> has dropped below the safe threshold.</p>
     <p>Current stock: <strong style="color: #dc2626;">${quantity}</strong></p>
     <p>Reorder point: <strong>${reorderPoint}</strong></p>
     <p>Please reorder as soon as possible to avoid production delays.</p>`
  );

  try {
    await resend.emails.send({
      from: await getOrgFromAddress(organizationId),
      to: targets,
      subject: `Low Stock Alert: ${itemName}`,
      html,
    });
    logger.info(`Sent Low Stock Alert for ${itemName}`);
  } catch (err) {
    logger.error(`Failed to send low stock alert for ${itemName}`, err);
  }
}

// ─── SMS AUTOMATIONS ──────────────────────────────────────────────────────────

export async function sendOrderReadySMS(organizationId: string, customerPhone: string, orderNumber: string) {
  if (!(await isModuleEnabled(organizationId, 'SMS'))) return;
  if (!customerPhone || !twilioClient) return;

  try {
    await twilioClient.messages.create({
      body: `Your order ${orderNumber} is ready for pickup!`,
      from: TWILIO_PHONE_NUMBER,
      to: customerPhone,
    });
    logger.info(`Sent Order Ready SMS to ${customerPhone}`);
  } catch (err) {
    logger.error(`Failed to send SMS to ${customerPhone}`, err);
  }
}

export async function sendShipmentTrackingSMS(organizationId: string, customerPhone: string, orderNumber: string, trackingUrl: string) {
  if (!(await isModuleEnabled(organizationId, 'SMS'))) return;
  if (!customerPhone || !twilioClient) return;

  try {
    await twilioClient.messages.create({
      body: `Your order ${orderNumber} has shipped! Track it here: ${trackingUrl}`,
      from: TWILIO_PHONE_NUMBER,
      to: customerPhone,
    });
    logger.info(`Sent Shipment Tracking SMS to ${customerPhone}`);
  } catch (err) {
    logger.error(`Failed to send shipment SMS to ${customerPhone}`, err);
  }
}

// ─── BILLING / SUBSCRIPTION NOTIFICATIONS ─────────────────────────────────────
// These use emailService (Resend) directly and are NOT gated by the EMAIL module
// toggle — billing emails are always sent regardless of notification preferences.

export async function sendShipmentTrackingEmail(opts: {
  organizationId: string;
  customerEmail: string;
  customerName?: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  estimatedDelivery?: Date | null;
}) {
  if (!opts.customerEmail) return;

  const estimatedDelivery = opts.estimatedDelivery
    ? `<p>Estimated delivery: <strong>${opts.estimatedDelivery.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}</strong></p>`
    : '';
  const greeting = opts.customerName ? `Hello ${opts.customerName},` : 'Hello,';
  const html = emailWrapper(
    'Your Order Has Shipped',
    `<p>${greeting}</p>
     <p>Your order <strong>#${opts.orderNumber}</strong> has shipped with <strong>${opts.carrier}</strong>.</p>
     <div style="background: #f3f4f6; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
       <p style="margin: 0 0 6px;">Tracking number:</p>
       <strong style="color: #111827; font-size: 18px;">${opts.trackingNumber}</strong>
     </div>
     ${estimatedDelivery}
     <p>You can use the tracking link below to follow delivery progress.</p>`,
    'Track Shipment',
    opts.trackingUrl,
  );

  try {
    const { error } = await resend.emails.send({
      from: await getOrgFromAddress(opts.organizationId),
      to: opts.customerEmail,
      subject: `Tracking for order ${opts.orderNumber}`,
      html,
    });
    if (error) {
      logger.error(`Failed to send shipment email to ${opts.customerEmail}`, error);
      throw new Error(error.message);
    }
    logger.info(`Sent Shipment Tracking Email to ${opts.customerEmail}`);
  } catch (err) {
    logger.error(`Failed to send shipment email to ${opts.customerEmail}`, err);
    throw err;
  }
}

import * as emailService from './emailService';
import { APP_URL } from '../lib/resend';

async function withRetry<T>(fn: () => Promise<T>, label: string, maxAttempts = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fn();
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[notify] ${label} attempt ${attempt}/${maxAttempts} failed: ${msg}`);
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  logger.error(`[notify] ${label} failed after ${maxAttempts} attempts`);
}

async function getOrgOwner(orgId: string): Promise<{ email: string; firstName: string; name: string; logoUrl?: string } | null> {
  const [owner, org] = await Promise.all([
    prisma.user.findFirst({
      where: { organizationId: orgId, isOrganizationOwner: true, isActive: true },
      select: { email: true, firstName: true },
    }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, logoUrl: true } }),
  ]);
  if (!owner || !org) return null;
  return { email: owner.email, firstName: owner.firstName, name: org.name, logoUrl: org.logoUrl ?? undefined };
}

export function notifyWelcome(opts: { to: string; firstName: string; orgName: string; orgLogoUrl?: string }): void {
  void withRetry(() => emailService.sendWelcomeEmail(opts), `welcome → ${opts.to}`);
}

export function notifyInvite(opts: { to: string; inviterName: string; orgName: string; orgLogoUrl?: string; role: string; inviteToken: string; expiresAt: Date }): void {
  void withRetry(() => emailService.sendInviteEmail(opts), `invite → ${opts.to}`);
}

export async function notifySubscriptionConfirmed(orgId: string, opts: { planName: string; planFeatures: string[]; amountCents: number; nextBillingDate: Date; portalUrl?: string }): Promise<void> {
  const o = await getOrgOwner(orgId);
  if (!o) return;
  void withRetry(() => emailService.sendSubscriptionConfirmation({ to: o.email, orgName: o.name, orgLogoUrl: o.logoUrl, ...opts }), `sub-confirmed → ${o.email}`);
}

export async function notifyPaymentSuccess(orgId: string, opts: { amountCents: number; invoiceUrl?: string; billingDate: Date }): Promise<void> {
  const o = await getOrgOwner(orgId);
  if (!o) return;
  void withRetry(() => emailService.sendPaymentSuccess({ to: o.email, orgName: o.name, orgLogoUrl: o.logoUrl, ...opts }), `payment-ok → ${o.email}`);
}

export async function notifyPaymentFailed(orgId: string, opts: { amountCents: number }): Promise<void> {
  const o = await getOrgOwner(orgId);
  if (!o) return;
  const updatePaymentUrl = `${APP_URL}/settings/billing`;
  void withRetry(() => emailService.sendPaymentFailed({ to: o.email, orgName: o.name, orgLogoUrl: o.logoUrl, amountCents: opts.amountCents, updatePaymentUrl }), `payment-failed → ${o.email}`);
}

export async function notifySubscriptionCanceled(orgId: string, accessUntil: Date): Promise<void> {
  const o = await getOrgOwner(orgId);
  if (!o) return;
  void withRetry(() => emailService.sendSubscriptionCanceled({ to: o.email, orgName: o.name, orgLogoUrl: o.logoUrl, accessUntil }), `sub-canceled → ${o.email}`);
}

export async function notifyTrialEnding(orgId: string, daysLeft: number): Promise<void> {
  const o = await getOrgOwner(orgId);
  if (!o) return;
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  void withRetry(() => emailService.sendTrialEnding({ to: o.email, orgName: o.name, orgLogoUrl: o.logoUrl, daysLeft, planName: org?.plan ?? 'Trial' }), `trial-ending → ${o.email}`);
}

export async function notifyPlanLimitWarning(orgId: string, opts: { limitType: string; percentage: number; current: number; max: number }): Promise<void> {
  const o = await getOrgOwner(orgId);
  if (!o) return;
  void withRetry(() => emailService.sendPlanLimitWarning({ to: o.email, orgName: o.name, orgLogoUrl: o.logoUrl, ...opts }), `limit-warning → ${o.email}`);
}

export async function notifyUsageReport(orgId: string): Promise<void> {
  const o = await getOrgOwner(orgId);
  if (!o) return;
  const [orderCount, customerCount, userCount, inventoryCount, org] = await Promise.all([
    prisma.order.count({ where: { organizationId: orgId } }),
    prisma.customer.count({ where: { organizationId: orgId } }),
    prisma.user.count({ where: { organizationId: orgId } }),
    prisma.inventoryItem.count({ where: { organizationId: orgId } }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { maxOrders: true, maxCustomers: true, maxUsers: true, maxInventoryItems: true } }),
  ]);
  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  void withRetry(() => emailService.sendUsageReport({
    to: o.email, orgName: o.name, orgLogoUrl: o.logoUrl, month,
    usage: [
      { label: 'Orders',          current: orderCount,     max: org?.maxOrders ?? -1 },
      { label: 'Customers',       current: customerCount,  max: org?.maxCustomers ?? -1 },
      { label: 'Team Members',    current: userCount,      max: org?.maxUsers ?? -1 },
      { label: 'Inventory Items', current: inventoryCount, max: org?.maxInventoryItems ?? -1 },
    ],
  }), `usage-report → ${o.email}`);
}
