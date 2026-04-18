import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
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

export const organizationRouter = Router();

// ─── Public invite endpoints (no Clerk JWT required) ─────────────────────────
// These sit on the router but must be mounted BEFORE the clerkAuth / tenant
// middleware in app.ts.  We surface them here so all org-related routes live
// in one file; see app.ts for the mounting order.

organizationRouter.get('/invites/:token',  getInviteDetails);
organizationRouter.post('/invites/accept', acceptInviteHandler);

// ─── Authenticated endpoints ──────────────────────────────────────────────────
// All routes below require a valid Clerk session AND an organisation context.
// Both are guaranteed by the global middleware chain in app.ts
//   (clerkAuth → injectTenant → requireAuth).

// ── Organisation details ──────────────────────────────────────────────────────
organizationRouter.get('/',       requireAuth, getCurrent);
organizationRouter.patch('/',     requireAuth, requireRole(['org:admin', 'OWNER', 'ADMIN']), update);
organizationRouter.get('/usage',  requireAuth, getUsage);

// ── Team management ───────────────────────────────────────────────────────────
organizationRouter.get('/team',                    requireAuth, getTeam);
organizationRouter.post('/team/invite',             requireAuth, requireRole(['org:admin', 'OWNER', 'ADMIN']), inviteUserHandler);
organizationRouter.delete('/team/invites/:inviteId', requireAuth, requireRole(['org:admin', 'OWNER', 'ADMIN']), cancelInviteHandler);
organizationRouter.delete('/team/:userId',           requireAuth, requireRole(['org:admin', 'OWNER', 'ADMIN']), removeUser);
organizationRouter.patch('/team/:userId/role',       requireAuth, requireRole(['org:admin', 'OWNER', 'ADMIN']), updateUserRole);

// ── Billing ───────────────────────────────────────────────────────────────────
organizationRouter.get('/billing',  requireAuth, getBilling);
organizationRouter.get('/invoices', requireAuth, getInvoices);
