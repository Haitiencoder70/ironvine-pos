# Deep Code Review — touchscreenpos

**Reviewed:** 2026-04-25
**Depth:** Deep (cross-file analysis, import graph tracing, security boundary checks)
**Stack:** Vite + React 18 + TypeScript (frontend), Express + Prisma + TypeScript (backend), Neon PostgreSQL, Clerk auth, Stripe billing, Socket.IO, Cloudflare R2

---

## Executive Summary

Overall the codebase is well-structured and follows most project rules. Multi-tenancy is enforced at the middleware layer via AsyncLocalStorage + Prisma extensions. Auth is cleanly delegated to Clerk. Zod validation is consistently applied across all route handlers. No default exports exist anywhere.

However, there are **three bugs that will break real-time functionality and user lookups in production**, and a handful of high/medium-severity rule violations described below.

| Category | Status | Notes |
|---|---|---|
| Multi-tenant isolation (Prisma) | PASS | Prisma extension enforces orgId on all queries |
| Multi-tenant isolation (Socket.IO) | **FAIL** | Room ID type mismatch — events never reach clients |
| Authentication (Clerk) | PASS | All protected routes use Clerk middleware |
| No custom auth | PASS | |
| Zod validation — backend | PASS | All mutation routes validated |
| Zod validation — frontend forms | PASS | All forms use `zodResolver` |
| Named exports only | PASS | Zero `export default` in entire codebase |
| No console.log — backend production code | PASS | Only in script files (acceptable) |
| No console.log — frontend | **FAIL** | Multiple files |
| TypeScript strict / no `any` | PASS (minor exceptions in tests only) | |
| Touch targets ≥ 44px | PASS | TouchButton/TouchInput enforce this; 169 occurrences verified |
| Offline-aware mutations | PASS | API interceptor queues to IndexedDB on network error |
| TODO / placeholder code | PASS | None found |
| OrganizationId on every Prisma model | PASS | Schema verified |
| Rate limiting | PASS | Global + per-org + per-route limiters present |
| Stripe webhook verification | PASS | Signature checked before processing |
| Inline styles | WARNING | Widespread in dashboard components |

**Critical (P0) issues:** 2
**High (P1) issues:** 3
**Medium (P2) issues:** 3
**Low (P3) issues:** 4

---

## P0 — Critical Issues

### P0-01: Socket.IO room ID mismatch — real-time events are silently dropped

**Files:**
- `backend/src/index.ts` lines 36–42
- `backend/src/services/orderService.ts` lines 170, 268, 438
- `backend/src/services/inventoryService.ts` line 141

**Issue:**
The socket server assigns each authenticated connection to the room `org:<clerkOrgId>` (the Clerk external org ID from the JWT `org_id` claim). However, every call to `emitToOrg()` in the service layer passes `organizationId`, which is the internal Prisma row CUID (`orgDbId`). These are two entirely different values.

`index.ts`:
```ts
// Room is joined using the Clerk org ID from the JWT
const orgId = payload.org_id;  // e.g. "org_2abc123..."
void socket.join(`org:${orgId}`);
```

`orderService.ts`:
```ts
// emitToOrg is called with the DB row CUID
emitToOrg(organizationId, 'order:created', order);
// organizationId here = "clq5abc123..." (Prisma CUID, NOT Clerk org ID)
```

The room `org:<dbCuid>` has no members. All `order:created`, `order:status-changed`, `order:updated`, `inventory:low-stock`, and `po:received` real-time events are silently discarded.

**Fix:**
Service functions need to emit to the room using the Clerk org ID, not the DB row ID. The cleanest fix is to look up `clerkOrgId` from the organization at emit time, or to store both IDs in the `TenantContext` and use the Clerk ID for socket emissions.

Option A — Pass clerkOrgId through to services that emit:
```ts
// In orderController.ts, pass clerkOrgId from req.organizationId (Clerk ID)
const order = await createOrder({
  organizationId: orgDbId,        // DB ID for Prisma queries
  clerkOrgId: req.organizationId!, // Clerk ID for socket emissions
  ...
});

// In createOrder(), emit with clerkOrgId instead of organizationId
emitToOrg(clerkOrgId, 'order:created', order);
```

Option B — Have `emitToOrg` accept the DB ID and do a cache lookup:
The `TenantContext` already stores both `organizationId` (Clerk) and `organizationDbId` (DB). Services that call `emitToOrg` are already in the tenant context. Use `getCurrentOrganizationId()` from ALS inside `emitToOrg` rather than taking the org ID as a parameter.

---

### P0-02: `authController.getMe` queries by wrong field — always returns null

**File:** `backend/src/controllers/authController.ts` lines 10–13

**Issue:**
```ts
const user = await prisma.user.findUnique({
  where: { id: authReq.auth.userId },  // BUG: userId is the Clerk user ID
  include: { organization: true },
});
```

The `User` model's `id` field is a Prisma CUID (e.g. `clq5abc...`). `authReq.auth.userId` is the Clerk user ID (e.g. `user_2abc...`). These never match. The query always returns `null`, and every call to `GET /api/auth/me` returns the fallback `{ _source: 'clerk_token' }` response instead of the real user record.

**Fix:**
```ts
const user = await prisma.user.findUnique({
  where: { clerkUserId: authReq.auth.userId }, // correct field
  include: { organization: true },
});
```

---

## P1 — High Issues

### P1-01: AsyncLocalStorage tenant context not propagated when `setTenantContext` is called without callback

**File:** `backend/src/middleware/tenant.ts` lines 155–158

**Issue:**
`setTenantContext` is called without passing `next` as the callback:
```ts
setTenantContext({ organizationId: req.organizationId!, organizationDbId: req.organizationDbId! });
next(); // called separately — outside the ALS store
```

Looking at `tenantContext.ts` lines 31–38: when called without a callback and there is no existing store, the mutation-in-place silently does nothing because `storage.getStore()` returns `undefined` on the very first call in a new async chain:
```ts
const existing = storage.getStore();
if (existing) {
  existing.organizationId    = ctx.organizationId;
  existing.organizationDbId  = ctx.organizationDbId;
}
// If existing is undefined (first call), ctx is LOST silently
```

As a result, the Prisma tenant isolation extension's `getCurrentOrganization()` call may return `null` for some requests, bypassing the automatic `organizationId` filter and potentially allowing cross-tenant data access.

**Fix:**
Pass `next` as the callback so the entire downstream request runs inside the correct ALS store:
```ts
// In injectTenant middleware (tenant.ts), replace:
setTenantContext({ organizationId: req.organizationId!, organizationDbId: req.organizationDbId! });
next();

// With:
runWithTenantContext(
  { organizationId: req.organizationId!, organizationDbId: req.organizationDbId! },
  next,
);
```

`runWithTenantContext` is already exported from `tenantContext.ts` — just import and use it here.

---

### P1-02: `console.log/debug/error` used directly in production frontend code

**Files and lines:**
- `frontend/src/services/offlineSync.ts` lines 66, 75, 99, 102, 109, 135 — `console.debug` / `console.error`
- `frontend/src/services/socket.ts` lines 29, 36 — `console.debug` (even though guarded by `import.meta.env.DEV`, the pattern is inconsistent)
- `frontend/src/components/ErrorBoundary.tsx` line 28 — `console.error`
- `frontend/src/pages/orders/OrderDetail.tsx` lines 712, 743 — `console.error` as `onError` callback
- `frontend/src/pages/customers/AddEditCustomer.tsx` line 163 — `console.error`
- `frontend/src/hooks/useCamera.ts` line 68 — `console.error`
- `frontend/src/pages/products/AddEditProduct.tsx` line 926 — `console.error`

**Issue:**
CLAUDE.md rule: "No `console.log` — Use Winston (backend) or a logger service (frontend)." There is no logger service imported in the frontend. All direct `console.*` calls should route through a centralized logger that can be silenced in production.

**Fix:**
Create `frontend/src/lib/logger.ts`:
```ts
const isDev = import.meta.env.DEV;
export const logger = {
  debug: isDev ? console.debug.bind(console) : () => {},
  info:  isDev ? console.info.bind(console)  : () => {},
  warn:  console.warn.bind(console),
  error: console.error.bind(console), // errors always surfaced
};
```
Then replace all direct `console.*` calls with `logger.*`.

---

### P1-03: `offlineSync` uses `console.debug` directly (not ESLint-disabled)

**File:** `frontend/src/services/offlineSync.ts` lines 66, 75, 99, 102, 109, 135

**Issue:**
`socket.ts` at least uses `// eslint-disable-next-line no-console` before its `console.debug` calls, signaling intentional use. `offlineSync.ts` uses `console.debug` and `console.error` with no such annotation and no `import.meta.env.DEV` guard, meaning these fire in production builds. The `console.error` at lines 102 and 109 leak internal mutation IDs and sync failure details to the browser console in production.

**Fix:**
Import and use the logger service from P1-02 above, or at minimum add `import.meta.env.DEV` guards to all `console.debug` calls and keep only `console.error` (or logger.error) for actual errors.

---

## P2 — Medium Issues

### P2-01: Large component files exceed 200-line guideline

**Files:**
- `frontend/src/pages/orders/OrderDetail.tsx` — 874 lines
- `frontend/src/pages/orders/NewOrder.tsx` — 755 lines
- `frontend/src/pages/orders/OrderListPage.tsx` — 500 lines
- `frontend/src/pages/inventory/InventoryList.tsx` — 436 lines

**Issue:**
CLAUDE.md states "Components should split at ~200 lines." These files contain multiple distinct concerns (data fetching, state management, multiple sub-views, modals, helpers) and will become increasingly hard to maintain.

**Fix:**
Split each file into focused sub-components. For example, `OrderDetail.tsx` could be split into: `OrderDetailHeader`, `OrderDetailItems`, `OrderDetailCustomer`, `OrderDetailTimeline`, `OrderDetailImages` — each under 200 lines, co-located in a `frontend/src/pages/orders/components/` directory.

---

### P2-02: Inline `style={}` props violate "no inline styles" rule across dashboard components

**Files with the most violations:**
- `frontend/src/pages/dashboard/RecentOrders.tsx` — 11 inline style props (glassmorphism effects)
- `frontend/src/pages/dashboard/LowStockAlerts.tsx` — 14 inline style props
- `frontend/src/pages/dashboard/StatsGrid.tsx` — 7 inline style props
- `frontend/src/pages/dashboard/QuickActions.tsx` — 3 inline style props
- `frontend/src/pages/dashboard/TopProducts.tsx` — 3 inline style props
- `frontend/src/pages/dashboard/ProfitOverview.tsx` — 4 inline style props
- Plus 20 more files with at least 1 inline style (66 total occurrences across 20 files)

**Issue:**
CLAUDE.md rule: "No inline styles (use Tailwind)." Many of these inline styles are complex CSS values (gradients, backdrop-filter, rgba colors) that cannot be expressed with standard Tailwind utility classes. However, for maintainability and design-system consistency they should be extracted to either Tailwind arbitrary values, CSS custom properties, or a dedicated design-token file.

**Fix:**
For complex glassmorphism effects that are reused, extract to a CSS class in `index.css` or define Tailwind plugin tokens. For one-off values, use Tailwind's arbitrary value syntax: `bg-[linear-gradient(...)]` or `shadow-[...]`.

---

### P2-03: `TouchButton` component uses inline `style` props for visual design (design system violation)

**File:** `frontend/src/components/ui/TouchButton.tsx` lines 18–66

**Issue:**
The `variantStyles` object defines `React.CSSProperties` for each button variant (backgrounds, box-shadows, borders). These use inline styles passed via `style={{ ...vStyle.style, ...style }}` on the `<motion.button>`. This is the design system's primary interactive component, so the violation is load-bearing — fixing it upstream will fix all call sites.

**Fix:**
Replace the `style` objects in `variantStyles` with Tailwind arbitrary values or CSS custom properties. Consider using a CSS module or a `@layer components` block in `index.css` for the gradient + glow effects.

---

## P3 — Low / Style Issues

### P3-01: `backend/src/services/storageService.ts` reads credentials from `process.env` directly

**File:** `backend/src/services/storageService.ts` lines 7–11

**Issue:**
S3 configuration is read directly from `process.env` rather than from the validated `env` config object. This bypasses the Zod validation in `config/env.ts` and means S3 misconfiguration is only discovered at upload time (a runtime error) rather than at server startup (a startup error).

```ts
const S3_BUCKET = process.env.S3_BUCKET;   // not validated
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY; // not validated
```

**Fix:**
Add S3 variables to `backend/src/config/env.ts`:
```ts
S3_BUCKET: z.string().min(1).optional(),
S3_ACCESS_KEY: z.string().min(1).optional(),
S3_SECRET_KEY: z.string().min(1).optional(),
S3_ENDPOINT: z.string().url().optional(),
S3_PUBLIC_URL: z.string().url().optional(),
```
Then import `env` in `storageService.ts` instead of `process.env`.

---

### P3-02: `backend/src/middleware/limits.ts` is a near-duplicate of `backend/src/middleware/usage.ts`

**Files:**
- `backend/src/middleware/limits.ts` — `checkLimit(resource)` factory
- `backend/src/middleware/usage.ts` — `checkOrderLimit`, `checkUserLimit`, etc.

**Issue:**
Both files implement the same "fetch org limits, count current usage, reject with 4xx if over limit" pattern. Only `usage.ts` is actually imported and used (in routes). `limits.ts` appears to be a dead file. The 402 status code (payment required) in `usage.ts` is also more semantically correct than the 403 used in `limits.ts`.

**Fix:**
Delete `limits.ts` (or confirm it's unused and then remove it).

---

### P3-03: Magic numbers in `offlineSync.ts` retry logic

**File:** `frontend/src/services/offlineSync.ts` lines 108

**Issue:**
```ts
if (updated.retryCount >= 5) {  // magic number
```

**Fix:**
Extract to a named constant:
```ts
const MAX_RETRY_COUNT = 5;
if (updated.retryCount >= MAX_RETRY_COUNT) {
```

---

### P3-04: `backend/src/services/dashboardService.ts` `getProfitTrend` uses a serial loop for database queries

**File:** `backend/src/services/dashboardService.ts` lines 162–196

**Issue:**
The function iterates `months` times (default 6) in a `for` loop, with each iteration `await`ing two Prisma queries. This is 12 sequential database round-trips when all 12 queries could be parallelized with `Promise.all`.

**Fix:**
```ts
const results = await Promise.all(
  Array.from({ length: months }, (_, i) => months - 1 - i).map(async (i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const [revenueResult, costRows] = await Promise.all([...]);
    return { month: ..., revenue, costs, profit };
  })
);
```

---

## What Is Working Well

- **Multi-tenant Prisma isolation** is excellent. The `tenantIsolationExtension` using `$extends` and `AsyncLocalStorage` is a robust, correct implementation that auto-applies `organizationId` filters to all model operations without any per-query boilerplate.

- **Socket.IO auth** is correctly implemented — every connection is rejected if it has no valid Clerk JWT with an `org_id` claim. The room naming convention (`org:<clerkOrgId>`) is correct; only the emit side has the mismatch.

- **Stripe webhook security** is properly implemented: raw body parsing is applied before Clerk auth, and `stripe.webhooks.constructEvent` verifies the signature before processing any event.

- **Zod validation** is applied consistently on every mutating route. The `validate()` middleware factory is clean and correctly replaces `req.body`/`req.query` with the coerced/validated data.

- **Named exports** — the entire codebase uses named exports exclusively, as required.

- **Touch targets** — all primary interactive elements use `TouchButton` (min-h-[44px]) and `TouchInput` (min-h-[44px]). The design system components enforce this constraint.

- **Offline queue** — the IndexedDB mutation queue in `offlineSync.ts` and the axios interceptor that enqueues failed mutations are well-implemented. The retry-with-max logic and clean axios instance (to avoid re-enqueueing) are correct.

- **Rate limiting** — three layers: global (1000 req/15min), per-org (plan-aware), and per-route (auth routes, uploads). The org rate limiter correctly differentiates ENTERPRISE plan tenants.

- **Authorization** — the `authorize()` middleware fetches the user's DB role and checks granular permissions before executing any handler. Permission denials are logged to the activity log. The `requireRole()` guard for admin-only org management routes is applied correctly.

- **Error handling** — `errorHandler` correctly maps Prisma errors (`P2002`, `P2025`, `P2003`, `P2014`) to meaningful HTTP responses. Sentry is wired before the custom error handler so all unhandled errors are captured.

- **Subscription limits** — the `usage.ts` middleware factory correctly reads per-org limits from the DB row (allowing override without a deploy) and returns 402 Payment Required (not 403) when limits are reached.

---

_Reviewed: 2026-04-25_
_Reviewer: Claude (deep audit)_
_Files reviewed: backend/src/ and frontend/src/ — all controllers, routes, middleware, services, hooks, pages, and components_
