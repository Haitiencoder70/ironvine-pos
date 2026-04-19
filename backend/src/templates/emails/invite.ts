import { baseTemplate, ctaButton, h1, p, featureList, infoBox, divider } from './base';

export function inviteEmailHtml(opts: {
  inviterName: string;
  orgName: string;
  orgLogoUrl?: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}): string {
  const roleDesc: Record<string, string> = {
    OWNER:   'full admin access including billing and settings',
    MANAGER: 'access to orders, customers, inventory, reports, and team management',
    STAFF:   'access to orders, customers, and inventory',
  };
  const body = `
    ${h1(`You've been invited to join ${opts.orgName}`)}
    ${p(`<strong>${opts.inviterName}</strong> has invited you to join <strong>${opts.orgName}</strong> as a <strong>${opts.role}</strong>.`)}
    ${p(`As a ${opts.role}, you'll have ${roleDesc[opts.role] ?? 'access to the platform'}.`)}
    ${featureList([
      'Manage orders from creation to delivery',
      'Track inventory and get low-stock alerts',
      'Collaborate with your team in real time',
    ])}
    ${ctaButton('Accept Invitation', opts.acceptUrl)}
    ${infoBox(`This invitation expires on <strong>${opts.expiresAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.`)}
    ${divider}
    ${p(`If you weren't expecting this invitation, you can safely ignore this email.`, true)}
  `;
  return baseTemplate({ title: `Invitation to join ${opts.orgName}`, previewText: `${opts.inviterName} invited you to ${opts.orgName}`, body, orgName: opts.orgName, orgLogoUrl: opts.orgLogoUrl });
}

export function inviteEmailText(opts: { inviterName: string; orgName: string; role: string; acceptUrl: string }): string {
  return `${opts.inviterName} has invited you to join ${opts.orgName} as ${opts.role}.\n\nAccept your invitation: ${opts.acceptUrl}\n\nIf you weren't expecting this, ignore this email.`;
}
