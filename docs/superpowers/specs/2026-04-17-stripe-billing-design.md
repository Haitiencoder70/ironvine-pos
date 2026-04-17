# Stripe Billing Integration — Design Spec

**Date:** 2026-04-17
**Approach:** Stripe Checkout + Customer Portal (Option A)

---

## Overview

Implement production-ready Stripe billing for the multi-tenant POS SaaS. Every tenant (Organization) gets a Stripe customer record. Subscriptions are managed via Stripe-hosted Checkout and Customer Portal pages. A webhook handler keeps the local DB in sync with Stripe's subscription state.

---

## Section 1 — Schema Changes

### Organization model additions

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `customDomain` | `String?` | — | Future white-label domain support |
| `primaryColor` | `String?` | — | Org branding |
| `secondaryColor` | `String?` | — | Org branding |
| `trialEndsAt` | `DateTime?` | — | Trial expiry timestamp |
| `subscriptionEndsAt` | `DateTime?` | — | When a canceled subscription ends |
| `maxCustomers` | `Int` | `100` | Per-plan customer limit |
| `storageLimit` | `Int` | `524288000` | Per-plan storage limit in bytes (500 MB default) |
| `settings` | `Json` | `"{}"` | Arbitrary org-level config blob |

### SubscriptionPlan enum

Add `STARTER` tier between FREE and PRO:

```
FREE → STARTER → PRO → ENTERPRISE
```

Plan limits:

| Plan | maxUsers | maxOrders | maxInventoryItems | maxCustomers | storageLimit |
|------|----------|-----------|-------------------|--------------|--------------|
| FREE | 1 | 100 | 500 | 100 | 500 MB |
| STARTER | 3 | 1000 | 2000 | 500 | 2 GB |
| PRO | 10 | 5000 | 5000 | 2000 | 10 GB |
| ENTERPRISE | -1 | -1 | -1 | -1 | -1 |

### UserRole enum

Add `ADMIN` between OWNER and MANAGER:

```
OWNER → ADMIN → MANAGER → STAFF
```

### User model additions

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `isOrganizationOwner` | `Boolean` | `false` | True for the Clerk org owner |
| `inviteToken` | `String?` | — | Unique token for invite acceptance link |
| `inviteAccepted` | `Boolean` | `true` | False until invite link is clicked |
| `invitedBy` | `String?` | — | clerkUserId of the inviting user |

### New model: OrganizationInvite

Tracks pending invitations before the user accepts.

```prisma
model OrganizationInvite {
  id             String       @id @default(cuid())
  organizationId String
  email          String
  role           UserRole     @default(STAFF)
  token          String       @unique
  invitedBy      String
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime     @default(now())
  organization   Organization @relation(...)

  @@index([organizationId])
  @@index([email])
}
```

### New model: UsageMetrics

Monthly snapshot per org for billing dashboards and overage detection.

```prisma
model UsageMetrics {
  id              String       @id @default(cuid())
  organizationId  String
  periodStart     DateTime
  periodEnd       DateTime
  orderCount      Int          @default(0)
  customerCount   Int          @default(0)
  inventoryCount  Int          @default(0)
  userCount       Int          @default(0)
  storageUsed     Int          @default(0)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  organization    Organization @relation(...)

  @@unique([organizationId, periodStart])
  @@index([organizationId])
}
```

### New model: BillingHistory

One row per subscription lifecycle event.

```prisma
model BillingHistory {
  id             String       @id @default(cuid())
  organizationId String
  event          String       -- e.g. "subscription.created", "subscription.canceled"
  fromPlan       SubscriptionPlan?
  toPlan         SubscriptionPlan?
  stripeEventId  String       @unique
  metadata       Json?
  createdAt      DateTime     @default(now())
  organization   Organization @relation(...)

  @@index([organizationId, createdAt(sort: Desc)])
}
```

---

## Section 2 — Backend Billing Service

### New file: `backend/src/services/billingService.ts`

**`createCheckoutSession(orgDbId, plan, returnUrl)`**
1. Load org from DB, get `stripeCustomerId`
2. If no Stripe customer exists, call `stripe.customers.create()` and save `stripeCustomerId` to org
3. Look up the Stripe Price ID for the requested plan (from env vars: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTERPRISE`)
4. Call `stripe.checkout.sessions.create()` with `mode: "subscription"`, success/cancel URLs, and customer ID
5. Return the session URL

**`createPortalSession(orgDbId, returnUrl)`**
1. Load org, get `stripeCustomerId` (error if none — means they're on FREE)
2. Call `stripe.billingPortal.sessions.create()` with the customer ID and return URL
3. Return the portal URL

**`syncSubscription(stripeEvent)`**
1. Extract subscription object from Stripe event
2. Find org by `stripeCustomerId`
3. Map Stripe status → local `subscriptionStatus` and `SubscriptionPlan`
4. Update `plan`, `subscriptionStatus`, `stripeSubscriptionId`, `trialEndsAt`, `subscriptionEndsAt`
5. Write one row to `BillingHistory`

### New file: `backend/src/routes/billing.ts`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `POST` | `/api/billing/checkout` | requireAuth + injectTenant | `{ plan: "STARTER" \| "PRO" \| "ENTERPRISE" }` | `{ url: string }` |
| `POST` | `/api/billing/portal` | requireAuth + injectTenant | — | `{ url: string }` |
| `POST` | `/api/billing/webhook` | **none** (Stripe signature) | raw body | `{ received: true }` |

### Webhook handler

Verified using `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`.

Events handled:

| Stripe Event | Action |
|---|---|
| `checkout.session.completed` | Call `syncSubscription` |
| `customer.subscription.updated` | Call `syncSubscription` |
| `customer.subscription.deleted` | Downgrade org to FREE, set status to `canceled` |
| `invoice.payment_failed` | Set `subscriptionStatus` to `past_due` |

The webhook route must use `express.raw()` middleware (not `express.json()`) to preserve the raw body for signature verification.

---

## Section 3 — Frontend Billing Page

### New file: `frontend/src/pages/settings/Billing.tsx`

**Current plan card** — shows plan name, badge color, current usage vs limits:
- Orders used / max
- Customers used / max
- Users used / max
- Storage used / max

**Plan comparison table** — 4 columns (FREE, STARTER, PRO, ENTERPRISE) with:
- Price per month
- Feature checkmarks (users, orders, customers, storage, support level)
- "Current Plan" badge on active plan
- "Upgrade" button on higher plans → calls `POST /api/billing/checkout` → redirects to Stripe URL
- "Contact Sales" for ENTERPRISE

**Subscription management** (paid plans only):
- "Manage Subscription" button → calls `POST /api/billing/portal` → redirects to Stripe Portal
- Shows `trialEndsAt` warning if in trial period
- Shows `subscriptionEndsAt` warning if canceled but not yet expired

**Success/cancel handling:**
- URL param `?billing=success` → show green toast "Your plan has been updated!"
- URL param `?billing=canceled` → show neutral toast "Checkout canceled"

### Settings page integration

Add "Billing" tab to the Settings page nav (after "Integrations"). Route: `/settings/billing`.

---

## Environment Variables Required

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Out of Scope

- Stripe Elements (embedded card form) — using hosted Checkout instead
- Usage-based billing / overages — limits enforced by hard block, not charged
- Invoice PDF generation
- Hardware (WebUSB/HID) adapters
- Automated tests
