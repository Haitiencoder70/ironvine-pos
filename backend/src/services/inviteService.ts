import crypto from 'crypto';
import { Resend } from 'resend';
import { OrganizationInvite, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { SUBSCRIPTION_LIMITS } from '../types';
import { getFromAddress } from '../lib/resend';

const resend = new Resend(process.env['RESEND_API_KEY'] ?? 're_dummy_key');

const INVITE_TTL_HOURS = 72;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InviteUserInput {
  organizationId: string; // Prisma row ID
  email: string;
  role: UserRole;
  invitedByClerkUserId: string;
}

export interface AcceptInviteInput {
  token: string;
  clerkUserId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface AcceptInviteResult {
  userId: string;
  organizationId: string;
}

// ─── Email templates ──────────────────────────────────────────────────────────

function inviteEmailHtml(orgName: string, inviterName: string, role: string, link: string): string {
  return `
<!DOCTYPE html><html><head><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:40px 20px}
.c{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden}
.h{background:#2563eb;padding:30px 40px;text-align:center}
.h h1{color:#fff;margin:0;font-size:22px;font-weight:600}
.b{padding:36px 40px;color:#374151;font-size:15px;line-height:1.6}
.btn{display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:500;margin-top:24px}
.f{text-align:center;padding:16px 40px;color:#9ca3af;font-size:13px;border-top:1px solid #f3f4f6}
</style></head><body>
<div class="c">
  <div class="h"><h1>You've been invited!</h1></div>
  <div class="b">
    <p>Hi there,</p>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Ironvine POS as a <strong>${role}</strong>.</p>
    <p>Click the button below to accept your invitation. This link expires in ${INVITE_TTL_HOURS} hours.</p>
    <div style="text-align:center"><a href="${link}" class="btn">Accept Invitation</a></div>
    <p style="margin-top:28px;font-size:13px;color:#6b7280">If you weren't expecting this, you can safely ignore this email.</p>
  </div>
  <div class="f">Powered by Ironvine POS</div>
</div>
</body></html>`;
}

function welcomeEmailHtml(firstName: string, orgName: string, loginUrl: string): string {
  return `
<!DOCTYPE html><html><head><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:40px 20px}
.c{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden}
.h{background:#16a34a;padding:30px 40px;text-align:center}
.h h1{color:#fff;margin:0;font-size:22px;font-weight:600}
.b{padding:36px 40px;color:#374151;font-size:15px;line-height:1.6}
.btn{display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:500;margin-top:24px}
.f{text-align:center;padding:16px 40px;color:#9ca3af;font-size:13px;border-top:1px solid #f3f4f6}
</style></head><body>
<div class="c">
  <div class="h"><h1>Welcome to ${orgName}!</h1></div>
  <div class="b">
    <p>Hi ${firstName},</p>
    <p>Your account is all set up. You can now log in and start using Ironvine POS.</p>
    <div style="text-align:center"><a href="${loginUrl}" class="btn">Go to Dashboard</a></div>
  </div>
  <div class="f">Powered by Ironvine POS</div>
</div>
</body></html>`;
}

function cancelledInviteEmailHtml(orgName: string): string {
  return `
<!DOCTYPE html><html><head><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:40px 20px}
.c{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden}
.h{background:#6b7280;padding:30px 40px;text-align:center}
.h h1{color:#fff;margin:0;font-size:22px;font-weight:600}
.b{padding:36px 40px;color:#374151;font-size:15px;line-height:1.6}
.f{text-align:center;padding:16px 40px;color:#9ca3af;font-size:13px;border-top:1px solid #f3f4f6}
</style></head><body>
<div class="c">
  <div class="h"><h1>Invitation Cancelled</h1></div>
  <div class="b">
    <p>Hi,</p>
    <p>Your invitation to join <strong>${orgName}</strong> on Ironvine POS has been cancelled. If you believe this is a mistake, please contact the organisation's owner.</p>
  </div>
  <div class="f">Powered by Ironvine POS</div>
</div>
</body></html>`;
}

// ─── inviteUser ───────────────────────────────────────────────────────────────

export async function inviteUser(input: InviteUserInput): Promise<{ invite: OrganizationInvite; inviteLink: string }> {
  const { organizationId, email, role, invitedByClerkUserId } = input;

  const org = await prisma.organization.findUnique({
    where:  { id: organizationId },
    select: { id: true, name: true, plan: true, maxUsers: true, emailFromName: true, emailFromAddress: true },
  });
  if (!org) throw new AppError(404, 'Organisation not found.', 'ORG_NOT_FOUND');

  // Check if user is already a member
  const existing = await prisma.user.findFirst({
    where: { email, organizationId },
    select: { id: true, isActive: true },
  });
  if (existing?.isActive) {
    throw new AppError(409, `${email} is already an active member of this organisation.`, 'ALREADY_MEMBER');
  }

  // If a pending invite already exists, resend it rather than blocking
  const pendingInvite = await prisma.organizationInvite.findFirst({
    where: { email, organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (pendingInvite) {
    const inviter = await prisma.user.findFirst({
      where:  { clerkUserId: invitedByClerkUserId, organizationId },
      select: { firstName: true, lastName: true },
    });
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'A team member';
    const inviteLink  = `${env.FRONTEND_URL}/invite/accept?token=${pendingInvite.token}`;
    try {
      await resend.emails.send({
        from:    getFromAddress(org),
        to:      email,
        subject: `You've been invited to join ${org.name} on Ironvine POS`,
        html:    inviteEmailHtml(org.name, inviterName, role, inviteLink),
      });
    } catch (err) {
      logger.error('Failed to resend invite email', { err, email, organizationId });
    }
    logger.info('Invite resent', { email, organizationId });
    return { invite: pendingInvite, inviteLink };
  }

  // Enforce user-seat limit
  const maxUsers = org.maxUsers === -1
    ? Infinity
    : org.maxUsers;
  const currentUsers = await prisma.user.count({ where: { organizationId, isActive: true } });
  if (currentUsers >= maxUsers) {
    const planLabel = org.plan;
    const planMax   = SUBSCRIPTION_LIMITS[planLabel as keyof typeof SUBSCRIPTION_LIMITS]?.maxUsers ?? maxUsers;
    throw new AppError(
      402,
      `User seat limit reached (${currentUsers}/${planMax} on ${planLabel} plan). Please upgrade to invite more team members.`,
      'PLAN_LIMIT_REACHED',
    );
  }

  // Look up inviter's name for the email
  const inviter = await prisma.user.findFirst({
    where:  { clerkUserId: invitedByClerkUserId, organizationId },
    select: { firstName: true, lastName: true },
  });
  const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'A team member';

  // Generate a cryptographically secure token
  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

  const invite = await prisma.organizationInvite.create({
    data: { organizationId, email, role, token, invitedBy: invitedByClerkUserId, expiresAt },
  });

  const inviteLink = `${env.FRONTEND_URL}/invite/accept?token=${token}`;

  // Send email (non-fatal)
  try {
    await resend.emails.send({
      from:    getFromAddress(org),
      to:      email,
      subject: `You've been invited to join ${org.name} on Ironvine POS`,
      html:    inviteEmailHtml(org.name, inviterName, role, inviteLink),
    });
  } catch (err) {
    logger.error('Failed to send invite email', { err, email, organizationId });
  }

  logger.info('User invited', { email, organizationId, role });
  return { invite, inviteLink };
}

// ─── acceptInvite ─────────────────────────────────────────────────────────────

export async function acceptInvite(input: AcceptInviteInput): Promise<AcceptInviteResult> {
  const { token, clerkUserId, firstName, lastName, avatarUrl } = input;

  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: { organization: { select: { id: true, name: true, emailFromName: true, emailFromAddress: true } } },
  });

  if (!invite)                          throw new AppError(404, 'Invite not found.',                     'INVITE_NOT_FOUND');
  if (invite.acceptedAt)                throw new AppError(410, 'This invitation has already been used.', 'INVITE_USED');
  if (invite.expiresAt < new Date())    throw new AppError(410, 'This invitation has expired.',           'INVITE_EXPIRED');

  const orgId = invite.organizationId;

  // Check if a User row already exists (e.g. rejoining after removal)
  const existingUser = await prisma.user.findFirst({
    where:  { email: invite.email, organizationId: orgId },
    select: { id: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    let userId: string;

    if (existingUser) {
      await tx.user.update({
        where: { id: existingUser.id },
        data:  { clerkUserId, firstName, lastName, avatarUrl, isActive: true, role: invite.role, inviteAccepted: true },
      });
      userId = existingUser.id;
    } else {
      const user = await tx.user.create({
        data: {
          clerkUserId,
          email:          invite.email,
          firstName,
          lastName,
          avatarUrl,
          role:           invite.role,
          isActive:       true,
          inviteAccepted: true,
          invitedBy:      invite.invitedBy,
          organizationId: orgId,
        },
      });
      userId = user.id;
    }

    // Mark invite as accepted
    await tx.organizationInvite.update({
      where: { id: invite.id },
      data:  { acceptedAt: new Date() },
    });

    await tx.activityLog.create({
      data: {
        action:        'CREATED',
        entityType:    'User',
        entityId:      userId,
        entityLabel:   `${firstName} ${lastName}`,
        description:   `${firstName} ${lastName} accepted an invitation and joined the organisation.`,
        performedBy:   clerkUserId,
        organizationId: orgId,
      },
    });

    return { userId, organizationId: orgId };
  });

  // Send welcome email (non-fatal)
  try {
    await resend.emails.send({
      from:    getFromAddress(invite.organization),
      to:      invite.email,
      subject: `Welcome to ${invite.organization.name}!`,
      html:    welcomeEmailHtml(firstName, invite.organization.name, `${env.FRONTEND_URL}/dashboard`),
    });
  } catch (err) {
    logger.error('Failed to send welcome email', { err, email: invite.email });
  }

  logger.info('Invite accepted', { inviteId: invite.id, userId: result.userId });
  return result;
}

// ─── cancelInvite ─────────────────────────────────────────────────────────────
//
// The schema has no `canceledAt` column. We expire the invite immediately by
// setting `expiresAt` to `now()`, which makes all validity checks reject it.

export async function cancelInvite(inviteId: string, organizationId: string): Promise<void> {
  const invite = await prisma.organizationInvite.findUnique({
    where:   { id: inviteId },
    include: { organization: { select: { name: true, emailFromName: true, emailFromAddress: true } } },
  });

  if (!invite || invite.organizationId !== organizationId) {
    throw new AppError(404, 'Invite not found.', 'INVITE_NOT_FOUND');
  }
  if (invite.acceptedAt) {
    throw new AppError(409, 'Cannot cancel an invite that has already been accepted.', 'INVITE_ALREADY_ACCEPTED');
  }

  // Expire the invite immediately
  await prisma.organizationInvite.update({
    where: { id: inviteId },
    data:  { expiresAt: new Date() },
  });

  // Notify the invitee (non-fatal)
  try {
    await resend.emails.send({
      from:    getFromAddress(invite.organization),
      to:      invite.email,
      subject: `Your invitation to ${invite.organization.name} has been cancelled`,
      html:    cancelledInviteEmailHtml(invite.organization.name),
    });
  } catch (err) {
    logger.error('Failed to send invite cancellation email', { err, email: invite.email });
  }

  logger.info('Invite cancelled', { inviteId, email: invite.email });
}

// ─── getInvite (utility for routes) ──────────────────────────────────────────

export async function getInviteByToken(token: string): Promise<OrganizationInvite & { organization: { name: string; slug: string } }> {
  const invite = await prisma.organizationInvite.findUnique({
    where:   { token },
    include: { organization: { select: { name: true, slug: true } } },
  });

  if (!invite)               throw new AppError(404, 'Invite not found.',           'INVITE_NOT_FOUND');
  if (invite.acceptedAt)     throw new AppError(410, 'Invite already accepted.',     'INVITE_USED');
  if (invite.expiresAt < new Date()) throw new AppError(410, 'Invite has expired.', 'INVITE_EXPIRED');

  return invite as OrganizationInvite & { organization: { name: string; slug: string } };
}
