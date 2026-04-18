import { baseTemplate, ctaButton, h1, p, featureList, infoBox, divider } from './base';
import { APP_URL } from '../../lib/resend';

// ─── Subscription Confirmation ────────────────────────────────────────────────

export function subscriptionConfirmationHtml(opts: {
  orgName: string;
  orgLogoUrl?: string;
  planName: string;
  planFeatures: string[];
  amount: number;
  nextBillingDate: Date;
  portalUrl?: string;
}): string {
  const body = `
    ${h1(`You're subscribed to ${opts.planName}! 🚀`)}
    ${p(`Thank you, <strong>${opts.orgName}</strong>! Your subscription is now active.`)}
    ${featureList(opts.planFeatures)}
    ${infoBox(`Your next billing date is <strong>${opts.nextBillingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>. You'll be charged <strong>$${(opts.amount / 100).toFixed(2)}</strong>.`)}
    ${ctaButton('Go to Dashboard', `${APP_URL}/dashboard`)}
    ${divider}
    ${p(`To manage your subscription, update payment methods, or download invoices:`, true)}
    ${opts.portalUrl ? ctaButton('Manage Subscription', opts.portalUrl, '#64748b') : ''}
  `;
  return baseTemplate({ title: `Welcome to ${opts.planName}`, previewText: `Your ${opts.planName} subscription is active`, body, orgName: opts.orgName, orgLogoUrl: opts.orgLogoUrl });
}

// ─── Payment Success ──────────────────────────────────────────────────────────

export function paymentSuccessHtml(opts: {
  orgName: string;
  orgLogoUrl?: string;
  amount: number;
  invoiceUrl?: string;
  billingDate: Date;
}): string {
  const body = `
    ${h1('Payment received ✅')}
    ${p(`We've received your payment of <strong>$${(opts.amount / 100).toFixed(2)}</strong> on ${opts.billingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`)}
    ${infoBox('Your subscription is active and no action is required.')}
    ${opts.invoiceUrl ? ctaButton('Download Invoice', opts.invoiceUrl, '#16a34a') : ''}
    ${divider}
    ${p('Questions about your bill? Contact us at support@yourapp.com', true)}
  `;
  return baseTemplate({ title: 'Payment received', previewText: `Payment of $${(opts.amount / 100).toFixed(2)} confirmed`, body, orgName: opts.orgName, orgLogoUrl: opts.orgLogoUrl });
}

// ─── Payment Failed ───────────────────────────────────────────────────────────

export function paymentFailedHtml(opts: {
  orgName: string;
  orgLogoUrl?: string;
  amount: number;
  updatePaymentUrl: string;
  gracePeriodDays?: number;
}): string {
  const grace = opts.gracePeriodDays ?? 7;
  const body = `
    ${h1('Payment failed ⚠️')}
    ${p(`We were unable to charge <strong>$${(opts.amount / 100).toFixed(2)}</strong> for your <strong>${opts.orgName}</strong> subscription.`)}
    ${infoBox(`<strong>Action required:</strong> Please update your payment method within <strong>${grace} days</strong> to avoid losing access to your account.`, '#fef2f2', '#fca5a5')}
    ${ctaButton('Update Payment Method', opts.updatePaymentUrl, '#dc2626')}
    ${divider}
    ${p(`Common reasons for failed payments: expired card, insufficient funds, or bank decline. If you need help, reply to this email.`, true)}
  `;
  return baseTemplate({ title: 'Payment failed — action required', previewText: 'Please update your payment method', body, orgName: opts.orgName, orgLogoUrl: opts.orgLogoUrl });
}

// ─── Trial Ending ─────────────────────────────────────────────────────────────

export function trialEndingHtml(opts: {
  orgName: string;
  orgLogoUrl?: string;
  daysLeft: number;
  planName: string;
  upgradeUrl: string;
}): string {
  const urgency = opts.daysLeft <= 1 ? '🚨 Last chance' : opts.daysLeft <= 3 ? '⏰ Ending soon' : '📅 Heads up';
  const body = `
    ${h1(`${urgency} — your trial ends in ${opts.daysLeft} day${opts.daysLeft !== 1 ? 's' : ''}`)}
    ${p(`Your free trial of <strong>${opts.planName}</strong> for <strong>${opts.orgName}</strong> will end soon.`)}
    ${p('Upgrade now to keep access to all features without interruption.')}
    ${featureList([
      'All your data stays intact',
      'No setup required — just upgrade',
      'Cancel anytime, no long-term commitment',
    ])}
    ${ctaButton('Upgrade Now', opts.upgradeUrl)}
    ${divider}
    ${p(`After your trial ends, your account will revert to the Free plan. You won't lose any data.`, true)}
  `;
  return baseTemplate({ title: `Trial ends in ${opts.daysLeft} days`, previewText: `Your trial ends in ${opts.daysLeft} days — upgrade to keep access`, body, orgName: opts.orgName, orgLogoUrl: opts.orgLogoUrl });
}

// ─── Subscription Canceled ────────────────────────────────────────────────────

export function subscriptionCanceledHtml(opts: {
  orgName: string;
  orgLogoUrl?: string;
  accessUntil: Date;
  reactivateUrl: string;
}): string {
  const body = `
    ${h1('Your subscription has been canceled')}
    ${p(`We're sorry to see you go, <strong>${opts.orgName}</strong>.`)}
    ${infoBox(`You'll have full access to your account until <strong>${opts.accessUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>. After that, your account will revert to the Free plan.`)}
    ${p('Your data will be preserved. You can reactivate anytime.')}
    ${ctaButton('Reactivate Subscription', opts.reactivateUrl, '#16a34a')}
    ${divider}
    ${p(`If you canceled by mistake or have feedback, we'd love to hear from you. Reply to this email.`, true)}
  `;
  return baseTemplate({ title: 'Subscription canceled', previewText: `Access continues until ${opts.accessUntil.toLocaleDateString()}`, body, orgName: opts.orgName, orgLogoUrl: opts.orgLogoUrl });
}

// ─── Plan Limit Warning ───────────────────────────────────────────────────────

export function planLimitWarningHtml(opts: {
  orgName: string;
  orgLogoUrl?: string;
  limitType: string;
  percentage: number;
  current: number;
  max: number;
  upgradeUrl: string;
}): string {
  const bar = Math.round(opts.percentage / 10);
  const filled = '█'.repeat(bar);
  const empty = '░'.repeat(10 - bar);
  const body = `
    ${h1(`You're using ${opts.percentage}% of your ${opts.limitType} limit`)}
    ${p(`<strong>${opts.orgName}</strong> is approaching its ${opts.limitType} limit.`)}
    ${infoBox(`
      <strong>${opts.current.toLocaleString()} / ${opts.max.toLocaleString()}</strong> ${opts.limitType}<br />
      <span style="font-family:monospace;font-size:16px;letter-spacing:2px;color:${opts.percentage >= 90 ? '#dc2626' : '#d97706'};">${filled}${empty}</span> ${opts.percentage}%
    `, opts.percentage >= 90 ? '#fef2f2' : '#fffbeb', opts.percentage >= 90 ? '#fca5a5' : '#fcd34d')}
    ${p('Upgrade your plan to increase your limits and keep your workflow uninterrupted.')}
    ${ctaButton('Upgrade Plan', opts.upgradeUrl)}
  `;
  return baseTemplate({ title: `${opts.percentage}% of ${opts.limitType} limit used`, previewText: `You're at ${opts.percentage}% of your ${opts.limitType} limit`, body, orgName: opts.orgName, orgLogoUrl: opts.orgLogoUrl });
}

// ─── Monthly Usage Report ─────────────────────────────────────────────────────

export function usageReportHtml(opts: {
  orgName: string;
  orgLogoUrl?: string;
  month: string;
  usage: { label: string; current: number; max: number }[];
  upgradeUrl: string;
}): string {
  const rows = opts.usage.map((u) => {
    const pct = u.max === -1 ? 0 : Math.min(Math.round((u.current / u.max) * 100), 100);
    const status = u.max === -1 ? 'Unlimited' : `${u.current.toLocaleString()} / ${u.max.toLocaleString()} (${pct}%)`;
    const color = pct >= 90 ? '#dc2626' : pct >= 80 ? '#d97706' : '#16a34a';
    return `<tr>
      <td style="padding:10px 0;font-size:14px;color:#334155;border-bottom:1px solid #f1f5f9;">${u.label}</td>
      <td style="padding:10px 0;font-size:14px;color:${color};font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">${status}</td>
    </tr>`;
  }).join('');

  const body = `
    ${h1(`Your ${opts.month} usage report`)}
    ${p(`Here's a summary of how <strong>${opts.orgName}</strong> used its plan this month:`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <thead>
        <tr>
          <th style="text-align:left;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">Resource</th>
          <th style="text-align:right;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">Usage</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${opts.usage.some((u) => u.max !== -1 && u.current / u.max >= 0.8) ? ctaButton('Upgrade Plan', opts.upgradeUrl) : ctaButton('View Dashboard', `${APP_URL}/dashboard`)}
  `;
  return baseTemplate({ title: `${opts.month} usage report`, previewText: `Your monthly usage summary for ${opts.orgName}`, body, orgName: opts.orgName, orgLogoUrl: opts.orgLogoUrl });
}
