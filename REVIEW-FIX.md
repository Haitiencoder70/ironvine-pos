---
phase: code-review
fixed_at: 2026-04-23T00:00:00Z
review_path: REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Code Review Fix Report

**Fixed at:** 2026-04-23  
**Source review:** REVIEW.md  
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

---

## Fixed Issues

### CRIT-001: Tenant isolation bypass on image read endpoint

**File modified:** `backend/src/routes/images.ts`  
**Commit:** `ac7774b`  
**Applied fix:** Added `authorize('images:view')` middleware to the `GET /:entityType/:entityId` route, consistent with how other image mutations (upload, delete, reorder) are already protected. Any authenticated user from a foreign org can no longer enumerate another tenant's entity images.

---

### CRIT-002: Invite accept — user-supplied clerkUserId allows account takeover

**File modified:** `backend/src/controllers/organizationController.ts`  
**Commit:** `662b231`  
**Applied fix:** Removed `clerkUserId` from `acceptInviteSchema` so it can no longer be supplied by the caller. In `acceptInviteHandler`, `clerkUserId` is now read from `getAuth(req).userId` (the verified Clerk JWT) and an explicit 401 is returned if no session exists. The extracted value is merged into the service call as `{ ...parsed.data, clerkUserId }`.

---

### CRIT-003: Middleware ordering — injectTenant runs before requireAuth

**File modified:** `backend/src/app.ts`  
**Commit:** `3d687a5`  
**Applied fix:** Swapped the two global `/api` middleware lines so `requireAuth` now runs first (populating `req.auth`), followed by `injectTenant`. This ensures the ORG_MISMATCH cross-check inside `injectTenant` has `authReq.auth.orgId` available and can actually fire. Updated the inline comment to reflect the corrected order.

---

### CRIT-004: VITE_DEV_SUBDOMAIN in production silently collapses multi-tenancy

**File modified:** `backend/src/middleware/tenant.ts`  
**Commit:** `f19c032`  
**Applied fix:** Wrapped the `VITE_DEV_SUBDOMAIN` read so it evaluates to `undefined` when `NODE_ENV === 'production'`. Added a `logger.error` call that fires immediately if the variable is present in production, making the misconfiguration visible in logs rather than silently degrading multi-tenancy.

---

### CRIT-005: Stack traces written to disk file in production error handler

**File modified:** `backend/src/middleware/errorHandler.ts`  
**Commit:** `c17249c`  
**Applied fix:** Removed the entire `try { require('fs').appendFileSync(...) } catch (e) {}` block (7 lines). The `logger.error` call immediately below it already captures message, stack, path, and method — Sentry picks up from there. No information is lost; disk writes and event-loop blocking are eliminated.

---

### CRIT-006: settings/users/:id — no Zod validation, role can be set to OWNER

**File modified:** `backend/src/controllers/settingsController.ts`  
**Commit:** `6fdf38f`  
**Applied fix:** Added `z` and `AppError` imports. Defined `updateUserSchema` with `role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional()` — OWNER is explicitly excluded from the enum, matching the restriction already present on the organization team endpoint. `updateUserHandler` now calls `updateUserSchema.safeParse(req.body)` and returns a 400 on failure, passing only the validated `parsed.data` to the service.

---

_Fixed: 2026-04-23_  
_Fixer: Claude (gsd-code-fixer)_  
_Iteration: 1_

---

## High Issues — Fixes Applied

**Fixed at:** 2026-04-23  
**Findings in scope:** 7  
**Fixed:** 7  
**Skipped:** 0

| ID | Title | Commit | Files Modified |
|----|-------|--------|----------------|
| HIGH-001 | `clerkAuth` error response leaks debug info | `87c243c` | `backend/src/middleware/auth.ts` |
| HIGH-002 | `/api/images/garment` and `/api/images/placeholder` missing `authorize()` | `a0f4e33` | `backend/src/routes/images.ts` |
| HIGH-003 | `reserveMaterials` raw query missing `organizationId` in WHERE clause | `bc6f5c0` | `backend/src/services/inventoryService.ts` |
| HIGH-004 | `createOrganization` allows client to set `plan` including ENTERPRISE | `4a15a36` | `backend/src/controllers/organizationController.ts` |
| HIGH-005 | Unvalidated `groupBy` parameter in report controller | `5c0adc6` | `backend/src/controllers/reportController.ts` |
| HIGH-006 | `getBilling` returns `stripeCustomerId` and `stripeSubscriptionId` to frontend | `63f367b` | `backend/src/controllers/organizationController.ts` |
| HIGH-007 | No rate limiting on public invite endpoints | `cf824e3` | `backend/src/routes/organizationRoutes.ts` |

**HIGH-001** (`87c243c`) — Removed the `debug` block (which exposed the Clerk publishable key prefix and length) and `details: err.message` from both error paths in `clerkAuth`. Both paths now return `{ error: 'Authentication service error', code: 'AUTH_SERVICE_ERROR' }`. Error details continue to be logged server-side via `logger.error`.

**HIGH-002** (`a0f4e33`) — Added `authorize('images:view')` middleware to `GET /api/images/garment` and `GET /api/images/placeholder`, consistent with the pattern already used on `GET /api/images/:entityType/:entityId`.

**HIGH-003** (`bc6f5c0`) — Added `AND "organizationId" = ${organizationId}` to the `SELECT ... FOR UPDATE` raw query in `reserveMaterials`. Previously the query locked and returned any row matching only `id`, relying on a post-fetch application-level check. The tenant filter is now enforced in SQL.

**HIGH-004** (`4a15a36`) — Removed `plan` from `createOrgSchema` so clients can no longer submit a plan during org creation. Removed `plan` from the `parsed.data` destructure. Hardcoded `plan: 'FREE'` in the Prisma `upsert` create branch.

**HIGH-005** (`5c0adc6`) — Added `import { z } from 'zod'` and a module-level `groupBySchema = z.enum(['day', 'week', 'month']).default('day')`. Replaced the unsafe `as 'day' | 'week' | 'month'` cast with `groupBySchema.parse(req.query.groupBy)`, which throws a `ZodError` on any value outside the allowed set.

**HIGH-006** (`63f367b`) — Removed `stripeCustomerId: true` and `stripeSubscriptionId: true` from the Prisma `select` in `getBilling`. The response now contains only: `plan`, `subscriptionStatus`, `trialEndsAt`, `subscriptionEndsAt`, `maxUsers`, `maxOrders`, `maxInventoryItems`, `maxCustomers`, `storageLimit`.

**HIGH-007** (`cf824e3`) — Imported `rateLimit` from `express-rate-limit` in `organizationRoutes.ts`. Defined `inviteLimiter` (20 requests per 15 minutes, keyed by IP). Applied it as first middleware on both `GET /invites/:token` and `POST /invites/accept` on the `publicInviteRouter`.
