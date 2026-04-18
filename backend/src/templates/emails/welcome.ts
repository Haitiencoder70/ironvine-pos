import { baseTemplate, ctaButton, h1, p, featureList, divider } from './base';
import { APP_URL } from '../../lib/resend';

export function welcomeEmailHtml(opts: {
  firstName: string;
  orgName: string;
  orgLogoUrl?: string;
  dashboardUrl?: string;
}): string {
  const url = opts.dashboardUrl ?? `${APP_URL}/dashboard`;
  const body = `
    ${h1(`Welcome to ${opts.orgName}, ${opts.firstName}! 🎉`)}
    ${p(`Your account is all set up. Here's what you can do to get started:`)}
    ${featureList([
      'Create your first order',
      'Add inventory items and track stock',
      'Invite your team members',
      'Set up your customer list',
      'Customize your settings and branding',
    ])}
    ${ctaButton('Go to Dashboard', url)}
    ${divider}
    ${p('Questions? Reply to this email or visit our help center — we\'re here to help.', true)}
  `;
  return baseTemplate({ title: `Welcome to ${opts.orgName}`, previewText: `Your ${opts.orgName} account is ready`, body, orgName: opts.orgName, orgLogoUrl: opts.orgLogoUrl });
}

export function welcomeEmailText(opts: { firstName: string; orgName: string; dashboardUrl?: string }): string {
  const url = opts.dashboardUrl ?? `${APP_URL}/dashboard`;
  return `Welcome to ${opts.orgName}, ${opts.firstName}!\n\nYour account is ready. Visit your dashboard: ${url}\n\nQuestions? Email support@yourapp.com`;
}
