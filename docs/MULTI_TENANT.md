# Multi-Tenant Architecture

## Overview

Each customer of this SaaS is an **Organization**. Every organization gets:
- Its own subdomain (`acme.yourapp.com`)
- Its own isolated data (orders, customers, inventory, etc.)
- Its own Clerk organization (user management)
- Its own Stripe customer (billing)

## How Tenant Resolution Works

Every API request goes through this chain:

```
Request arrives at backend
  → injectTenant middleware reads subdomain from Host header
  → Looks up Organization in DB by subdomain
  → Sets req.organizationDbId (Prisma row ID)
  → clerkAuth verifies the Clerk JWT
  → requireAuth checks userId is present and is a member of this org
  → Request handler runs (organizationId available on req)
```

If there is no subdomain (e.g. marketing domain `yourapp.com`), the middleware falls back to the Clerk `org_id` from the JWT to resolve the tenant.

## How organizationId Flows Through Every Layer

**Middleware sets it on the request:**
```typescript
// backend/src/middleware/tenant.ts
req.organizationDbId = org.id;  // Prisma row ID
req.organizationId   = org.clerkOrgId; // Clerk org ID
```

**Route handlers pass it to services:**
```typescript
router.post('/orders', requireAuth, checkLimit('orders'), async (req, res) => {
  const order = await orderService.create({
    ...req.body,
    organizationId: req.organizationDbId!, // always injected
  });
});
```

**Prisma middleware scopes all queries automatically:**
All `findMany`, `create`, `update`, `delete` calls are automatically scoped to the current tenant via `AsyncLocalStorage`. See `backend/src/middleware/tenantIsolation.ts`. This means even if a developer forgets to add `organizationId` to a query, the middleware adds it.

**Frontend resolves tenant from the URL:**
```typescript
// frontend/src/utils/tenant.ts
export function getCurrentSubdomain(): string | null {
  const hostname = window.location.hostname;
  if (hostname.endsWith('.localhost')) return hostname.replace(/\.localhost$/, '');
  if (hostname.endsWith(`.${APP_DOMAIN}`)) return hostname.slice(0, -APP_DOMAIN.length - 1);
  return null;
}
```

## Data Separation

All tenant data tables have a non-nullable foreign key:
```sql
"organizationId" TEXT NOT NULL REFERENCES organizations(id)
```

The Prisma middleware injects `WHERE "organizationId" = $current` on every read and prevents writes without the correct org context.

**Models excluded from tenant scoping** (global/cross-tenant):
- `Organization` itself — looked up by Clerk org ID or subdomain cross-tenant

## Adding a New Organization

Organizations are provisioned automatically when a user completes signup:

1. User fills the signup form → Clerk creates the org and user
2. The provisioning service calls `POST /api/organization` to create the local DB record
3. User is redirected to `slug.yourapp.com`

**To add one manually for testing:**
```bash
cd backend
npx tsx src/scripts/seed-multi-tenant.ts
```
This creates 3 demo orgs: `acme` (FREE), `riviera` (PRO), `blueprint` (ENTERPRISE).

## Testing Multi-Tenancy Locally

1. Start both dev servers (see [SETUP.md](SETUP.md))
2. Visit `http://acme.localhost:5173` — Chrome/Edge resolve `.localhost` subdomains natively
3. To test as a different org: open a different browser profile and visit `http://riviera.localhost:5173`

**Run the backend isolation test suite:**
```bash
cd backend
npm test src/tests/tenant-isolation.test.ts
```

These tests verify:
- Org A's resources are invisible in Org B's list responses
- Cross-tenant direct ID access returns `404` (not `403` — no data shape leakage)
- Requests with no org context are rejected

## Security Properties

| Property | How it's enforced |
|---|---|
| Data isolation | Prisma middleware injects `organizationId` on every query |
| Cross-tenant access | `requireAuth` verifies user membership in the resolved org |
| Subdomain spoofing | Subdomain → DB lookup → Clerk JWT cross-check |
| 404 vs 403 on ID access | Resources return 404 (not 403) to avoid confirming existence |
