import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireRole, clerkAuth } from '../middleware/auth';
import {
  getCurrent,
  update,
  getUsage,
  getTeam,
  inviteUserHandler,
  cancelInviteHandler,
  getInviteDetails,
  acceptInviteHandler,
  removeUser,
  updateUserRole,
  getBilling,
  getInvoices,
} from '../controllers/organizationController';

const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public invite endpoints (no Clerk JWT required) ─────────────────────────
// Mounted before clerkAuth in app.ts so unauthenticated invite-accept pages work.
export const publicInviteRouter = Router();
publicInviteRouter.get('/invites/:token',  inviteLimiter, getInviteDetails);
publicInviteRouter.post('/invites/accept', inviteLimiter, clerkAuth, acceptInviteHandler);

// ─── Authenticated router ─────────────────────────────────────────────────────
export const organizationRouter = Router();

// ─── Authenticated endpoints ──────────────────────────────────────────────────
// All routes below require a valid Clerk session AND an organisation context.
// Both are guaranteed by the global middleware chain in app.ts
//   (clerkAuth → injectTenant → requireAuth).

// ── Organisation details ──────────────────────────────────────────────────────
// Note: requireAuth is applied globally in app.ts — no need to repeat it here.
organizationRouter.get('/',      getCurrent);
organizationRouter.get('/me',    getCurrent);   // alias used by frontend
organizationRouter.patch('/',    requireRole(['org:admin', 'OWNER', 'ADMIN']), update);
organizationRouter.get('/usage', getUsage);

// ── Team management ───────────────────────────────────────────────────────────
organizationRouter.get('/team',                      getTeam);
organizationRouter.post('/team/invite',               requireRole(['org:admin', 'OWNER', 'ADMIN']), inviteUserHandler);
organizationRouter.delete('/team/invites/:inviteId',  requireRole(['org:admin', 'OWNER', 'ADMIN']), cancelInviteHandler);
organizationRouter.delete('/team/:userId',            requireRole(['org:admin', 'OWNER', 'ADMIN']), removeUser);
organizationRouter.patch('/team/:userId/role',        requireRole(['org:admin', 'OWNER', 'ADMIN']), updateUserRole);

// ── Billing ───────────────────────────────────────────────────────────────────
organizationRouter.get('/billing',  getBilling);
organizationRouter.get('/invoices', getInvoices);
