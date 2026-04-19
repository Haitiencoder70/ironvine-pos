import { resend, FROM_ADDRESS, APP_URL } from '../lib/resend';
import { logger } from '../lib/logger';
import {
  welcomeEmailHtml, welcomeEmailText,
} from '../templates/emails/welcome';
import {
  inviteEmailHtml, inviteEmailText,
} from '../templates/emails/invite';
import {
  subscriptionConfirmationHtml,
  paymentSuccessHtml,
  paymentFailedHtml,
  trialEndingHtml,
  subscriptionCanceledHtml,
  planLimitWarningHtml,
  usageReportHtml,
} from '../templates/emails/billing';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ─── Core send helper ─────────────────────────────────────────────────────────

async function send(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('[email] RESEND_API_KEY not set — skipping email send', { to: opts.to, subject: opts.subject });
    return { success: true, id: 'no-op' };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
    });
    if (error) {
      logger.error('[email] Resend error', { to: opts.to, subject: opts.subject, error });
      return { success: false, error: error.message };
    }
    logger.info('[email] Sent', { to: opts.to, subject: opts.subject, id: data?.id });
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('[email] Unexpected error', { to: opts.to, error: msg });
    return { success: false, error: msg };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  to: string;
  firstName: string;
  orgName: string;
  orgLogoUrl?: string;
}): Promise<SendResult> {
  return send({
    to: opts.to,
    subject: `Welcome to ${opts.orgName}! 🎉`,
    html: welcomeEmailHtml({ firstName: opts.firstName, orgName: opts.orgName, orgLogoUrl: opts.orgLogoUrl }),
    text: welcomeEmailText({ firstName: opts.firstName, orgName: opts.orgName }),
  });
}

export async function sendInviteEmail(opts: {
  to: string;
  inviterName: string;
  orgName: string;
  orgLogoUrl?: string;
  role: string;
  inviteToken: string;
  expiresAt: Date;
}): Promise<SendResult> {
  const acceptUrl = `${APP_URL}/accept-invite?token=${opts.inviteToken}`;
  return send({
    to: opts.to,
    subject: `You've been invited to join ${opts.orgName}`,
    html: inviteEmailHtml({
      inviterName: opts.inviterName,
      orgName: opts.orgName,
      orgLogoUrl: opts.orgLogoUrl,
      role: opts.role,
      acceptUrl,
      expiresAt: opts.expiresAt,
    }),
    text: inviteEmailText({ inviterName: opts.inviterName, orgName: opts.orgName, role: opts.role, acceptUrl }),
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  firstName: string;
  orgName: string;
  resetToken: string;
}): Promise<SendResult> {
  const resetUrl = `${APP_URL}/reset-password?token=${opts.resetToken}`;
  const html = `<p>Hi ${opts.firstName},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, ignore this email.</p>`;
  return send({
    to: opts.to,
    subject: 'Reset your password',
    html,
    text: `Hi ${opts.firstName},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });
}

export async function sendSubscriptionConfirmation(opts: {
  to: string;
  orgName: string;
  orgLogoUrl?: string;
  planName: string;
  planFeatures: string[];
  amountCents: number;
  nextBillingDate: Date;
  portalUrl?: string;
}): Promise<SendResult> {
  return send({
    to: opts.to,
    subject: `You're now on the ${opts.planName} plan 🚀`,
    html: subscriptionConfirmationHtml({
      orgName: opts.orgName,
      orgLogoUrl: opts.orgLogoUrl,
      planName: opts.planName,
      planFeatures: opts.planFeatures,
      amount: opts.amountCents,
      nextBillingDate: opts.nextBillingDate,
      portalUrl: opts.portalUrl,
    }),
    text: `Thank you for subscribing to ${opts.planName}! Your subscription is now active. Next billing: ${opts.nextBillingDate.toLocaleDateString()}.`,
  });
}

export async function sendPaymentSuccess(opts: {
  to: string;
  orgName: string;
  orgLogoUrl?: string;
  amountCents: number;
  invoiceUrl?: string;
  billingDate: Date;
}): Promise<SendResult> {
  return send({
    to: opts.to,
    subject: `Payment of $${(opts.amountCents / 100).toFixed(2)} received`,
    html: paymentSuccessHtml({
      orgName: opts.orgName,
      orgLogoUrl: opts.orgLogoUrl,
      amount: opts.amountCents,
      invoiceUrl: opts.invoiceUrl,
      billingDate: opts.billingDate,
    }),
    text: `Payment of $${(opts.amountCents / 100).toFixed(2)} received on ${opts.billingDate.toLocaleDateString()}.${opts.invoiceUrl ? ` Invoice: ${opts.invoiceUrl}` : ''}`,
  });
}

export async function sendPaymentFailed(opts: {
  to: string;
  orgName: string;
  orgLogoUrl?: string;
  amountCents: number;
  updatePaymentUrl: string;
  gracePeriodDays?: number;
}): Promise<SendResult> {
  return send({
    to: opts.to,
    subject: 'Action required: Payment failed',
    html: paymentFailedHtml({
      orgName: opts.orgName,
      orgLogoUrl: opts.orgLogoUrl,
      amount: opts.amountCents,
      updatePaymentUrl: opts.updatePaymentUrl,
      gracePeriodDays: opts.gracePeriodDays,
    }),
    text: `Payment of $${(opts.amountCents / 100).toFixed(2)} failed. Update your payment method: ${opts.updatePaymentUrl}`,
  });
}

export async function sendTrialEnding(opts: {
  to: string;
  orgName: string;
  orgLogoUrl?: string;
  daysLeft: number;
  planName: string;
  upgradeUrl?: string;
}): Promise<SendResult> {
  const upgradeUrl = opts.upgradeUrl ?? `${APP_URL}/settings/billing`;
  return send({
    to: opts.to,
    subject: `Your trial ends in ${opts.daysLeft} day${opts.daysLeft !== 1 ? 's' : ''}`,
    html: trialEndingHtml({
      orgName: opts.orgName,
      orgLogoUrl: opts.orgLogoUrl,
      daysLeft: opts.daysLeft,
      planName: opts.planName,
      upgradeUrl,
    }),
    text: `Your ${opts.planName} trial ends in ${opts.daysLeft} days. Upgrade now: ${upgradeUrl}`,
  });
}

export async function sendSubscriptionCanceled(opts: {
  to: string;
  orgName: string;
  orgLogoUrl?: string;
  accessUntil: Date;
  reactivateUrl?: string;
}): Promise<SendResult> {
  const reactivateUrl = opts.reactivateUrl ?? `${APP_URL}/settings/billing`;
  return send({
    to: opts.to,
    subject: 'Your subscription has been canceled',
    html: subscriptionCanceledHtml({
      orgName: opts.orgName,
      orgLogoUrl: opts.orgLogoUrl,
      accessUntil: opts.accessUntil,
      reactivateUrl,
    }),
    text: `Your subscription has been canceled. You have access until ${opts.accessUntil.toLocaleDateString()}. Reactivate: ${reactivateUrl}`,
  });
}

export async function sendPlanLimitWarning(opts: {
  to: string;
  orgName: string;
  orgLogoUrl?: string;
  limitType: string;
  percentage: number;
  current: number;
  max: number;
  upgradeUrl?: string;
}): Promise<SendResult> {
  const upgradeUrl = opts.upgradeUrl ?? `${APP_URL}/settings/billing`;
  return send({
    to: opts.to,
    subject: `You're using ${opts.percentage}% of your ${opts.limitType} limit`,
    html: planLimitWarningHtml({ ...opts, upgradeUrl }),
    text: `${opts.orgName} is using ${opts.percentage}% of its ${opts.limitType} limit (${opts.current}/${opts.max}). Upgrade: ${upgradeUrl}`,
  });
}

export async function sendUsageReport(opts: {
  to: string;
  orgName: string;
  orgLogoUrl?: string;
  month: string;
  usage: { label: string; current: number; max: number }[];
  upgradeUrl?: string;
}): Promise<SendResult> {
  const upgradeUrl = opts.upgradeUrl ?? `${APP_URL}/settings/billing`;
  return send({
    to: opts.to,
    subject: `Your ${opts.month} usage report — ${opts.orgName}`,
    html: usageReportHtml({ ...opts, upgradeUrl }),
    text: `Monthly usage report for ${opts.orgName} (${opts.month}):\n${opts.usage.map((u) => `${u.label}: ${u.current}${u.max === -1 ? ' (unlimited)' : `/${u.max}`}`).join('\n')}`,
  });
}
