# Billing Plan Catalog — Phase 1 Design Spec

**Date:** 2026-05-09
**Status:** Approved

---

## Goal

Remove hardcoded plan display data from all frontend pages and components. Establish a single backend source of truth for billing plan metadata exposed via a public API endpoint.

---

## Scope

**In scope:**
- Fix `PROFESSIONAL` → `PRO` key in `backend/src/constants/plans.ts`
- New `GET /api/billing/plans` endpoint (public, no auth)
- Update 4 frontend consumers to use the new hook
- Add `BillingPlan` type and `useBillingPlans()` hook

**Out of scope:**
- Admin plan editor
- Changing Stripe checkout behavior or price IDs
- Changing auth, tenant, or security middleware
- Yearly billing interval stored on the backend (frontend toggle math stays in the frontend)

---

## Current State

### The `PROFESSIONAL` / `PRO` mismatch

`backend/src/constants/plans.ts` uses the key `PROFESSIONAL` for the $79/mo plan. Every other part of the system — the Prisma `SubscriptionPlan` enum, `billingService.ts`, `stripe.ts`, and all frontend code — uses `PRO`. The constants file is currently unused by billing logic. This must be corrected before it can become the source of truth.

### Hardcoded plan data locations (to be replaced)

| File | What is hardcoded |
|---|---|
| `frontend/src/pages/settings/Billing.tsx` | `PLAN_DETAILS` object (labels, prices, badge classes, features) |
| `frontend/src/pages/signup/PricingPage.tsx` | Local `PLANS` array (name, price, features, popular flag) |
| `frontend/src/pages/signup/OrganizationSignup.tsx` | Local `PLANS` array (name, price, features, popular flag) |
| `frontend/src/components/UpgradeModal.tsx` | `PLAN_LABELS` record (label strings with embedded prices) |

These four copies are inconsistent with each other and with the backend constants (different order limits, different feature descriptions).

---

## Architecture

```
constants/plans.ts          ← single source of truth (backend)
        ↓
billingController.ts        ← plansHandler (pure transform, no DB/Stripe calls)
        ↓
routes/billing.ts           ← publicBillingRouter  GET /plans
        ↓
app.ts                      ← mounted before clerkAuth (line after webhookRouter)
        ↓
GET /api/billing/plans      ← public JSON endpoint
        ↓
useBilling.ts               ← BillingPlan type + useBillingPlans() hook
        ↓
4 frontend consumers        ← drop local constants, consume hook
```

---

## Backend

### 1. `constants/plans.ts`

Rename `PROFESSIONAL` → `PRO`. Change `name: 'Professional'` → `name: 'Pro'`. No other logic changes.

The canonical plan keys are: `FREE | STARTER | PRO | ENTERPRISE`.

`ENTERPRISE.price` changes from `199` to `null` to reflect that it is contact-sales / custom pricing. The `priceCents` derivation in the handler maps `null` → `null`.

```ts
// shape after change
PRO: {
  name: 'Pro',
  price: 79,
  stripePriceId: process.env.STRIPE_PRICE_PRO,
  popular: true,
  limits: { users: 10, ordersPerMonth: -1, inventoryItems: -1, customers: -1, storage: ... },
  features: [ ... ],
}

ENTERPRISE: {
  name: 'Enterprise',
  price: null,   // was 199 — null = Contact Sales / custom; TypeScript type: number | null
  stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
  limits: { ... },
  features: [ ... ],
}
```

The `price` field type in the `PLANS` constant becomes `number | null` (previously `number` for all plans). This is a TypeScript-only change — no runtime behavior changes. The `as const` assertion is removed from `price` fields or the type is widened explicitly to allow `null`.

`PlanKey` type export remains: `export type PlanKey = keyof typeof PLANS`.

### 2. `controllers/billingController.ts` — `plansHandler`

New handler, no auth required, no Prisma, no Stripe API calls.

Transforms `PLANS` into the public response array. Order is fixed by iterating `['FREE', 'STARTER', 'PRO', 'ENTERPRISE']`.

```ts
function isStripePriceConfigured(priceId: string | null | undefined): boolean {
  return !!priceId && !priceId.startsWith('price_placeholder');
}
```

**Response per plan:**

```ts
{
  key: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  label: string;                  // "Free", "Starter", "Pro", "Enterprise"
  priceCents: number | null;      // 0, 2900, 7900, null for Enterprise
  popular: boolean;               // true for PRO only
  active: boolean;                // true for all plans (always true in Phase 1)
  stripePriceConfigured: boolean; // derived from env var presence
  limits: {
    users: number;          // -1 = unlimited
    ordersPerMonth: number; // -1 = unlimited
    customers: number;      // -1 = unlimited
    inventoryItems: number; // -1 = unlimited
  };
  features: string[];
}
```

**What is NOT returned:**
- `stripePriceId` (the actual `price_xxx` value) — never exposed
- `storage` limit — internal only, not shown in UI
- Any org-specific data

**Response envelope:** plain array, no wrapper object.

```json
[
  { "key": "FREE", "label": "Free", "priceCents": 0, ... },
  { "key": "STARTER", "label": "Starter", "priceCents": 2900, ... },
  { "key": "PRO", "label": "Pro", "priceCents": 7900, "popular": true, ... },
  { "key": "ENTERPRISE", "label": "Enterprise", "priceCents": null, ... }
]
```

### 3. `routes/billing.ts`

Add a new exported router alongside the two existing ones. No changes to `billingWebhookRouter` or `billingRouter`.

```ts
export const publicBillingRouter = Router();
publicBillingRouter.get('/plans', plansHandler);
```

### 4. `app.ts`

One new line, inserted immediately after the existing webhook mount and before `clerkAuth`:

```ts
app.use('/api/billing', billingWebhookRouter);  // existing — raw body, before auth
app.use('/api/billing', publicBillingRouter);   // new — plain JSON, before auth
// ...
app.use('/api', clerkAuth);
// ...
app.use('/api/billing', billingRouter);         // existing — protected routes
```

`/webhook` uses `express.raw()` scoped inside its own router — no conflict with the new JSON route.

---

## Frontend

### 5. `hooks/useBilling.ts`

Add `BillingPlan` interface and `useBillingPlans()` query.

```ts
export interface BillingPlan {
  key: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  label: string;
  priceCents: number | null;
  popular: boolean;
  active: boolean;
  stripePriceConfigured: boolean;
  limits: {
    users: number;
    ordersPerMonth: number;
    customers: number;
    inventoryItems: number;
  };
  features: string[];
}

export function useBillingPlans() {
  return useQuery<BillingPlan[]>({
    queryKey: ['billing', 'plans'],
    queryFn: async () => {
      const res = await api.get<BillingPlan[]>('/billing/plans');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,  // 10 minutes — plan data rarely changes
    // no `enabled` guard — public endpoint, no auth required
  });
}
```

No changes to `BillingUsage`, `useBillingUsage`, `useCreateCheckout`, or `useOpenPortal`.

### 6. Consumer updates

Each file drops its local plan constant and calls `useBillingPlans()`. Frontend preserves the backend's response array order rather than re-declaring a `PLAN_ORDER` array.

#### 6a. `Billing.tsx`

- Remove `PLAN_DETAILS` and `PLAN_ORDER` constants.
- Call `useBillingPlans()`.
- Loading state: existing skeleton pattern extended to cover plan cards.
- Badge classes derived from `plan.key` with a local `badgeClass(key)` helper (pure style mapping, not plan data).
- `needsBillingSetup` and `currentPlan` logic unchanged — still derived from `useBillingUsage()`.
- Plan grid maps over `plans` array from the hook in order.
- Enterprise CTA: `plan.stripePriceConfigured ? checkout button : Contact Sales link`.

#### 6b. `PricingPage.tsx`

- Remove local `PLANS` array.
- Call `useBillingPlans()`.
- Loading state: skeleton cards in a `grid-cols-4` layout matching existing card structure.
- Error state: single centered message ("Pricing unavailable — please refresh").
- Yearly toggle math stays in the component: `priceCents / 100 * 0.8` for yearly display.
- `getYearlySavings` computed from `priceCents` (skips null / 0).
- Enterprise CTA: `stripePriceConfigured ? 'Choose Enterprise' : 'Contact Sales'` — no behavior change today since env var is not set.
- `getPricingCtaLabel` updated to accept `BillingPlan` instead of the local plan type.

#### 6c. `OrganizationSignup.tsx`

- Remove local `PLANS` array.
- Call `useBillingPlans()`.
- Loading state: skeleton plan cards.
- Plan selection logic driven by `plan.key` from the API response.
- `normalizePlan` validation updated to check against `['FREE', 'STARTER', 'PRO', 'ENTERPRISE']` — same values, now the canonical list lives only in this check.
- Enterprise: shown with Contact Sales CTA (`mailto:sales@printflowpos.com`), consistent with current behavior. Not selectable as an in-app checkout plan.

#### 6d. `UpgradeModal.tsx`

- Remove `PLAN_LABELS` and `PLAN_ORDER` constants.
- Call `useBillingPlans()`.
- Upgrade options: filter `plans` where `plan.key` index > current plan index — order from backend, no re-declaration.
- Label rendered as `` `${plan.label} — ${priceCents ? `$${priceCents / 100}/mo` : 'Custom'}` ``.
- Enterprise row: `mailto:sales@printflowpos.com` link, unchanged.

---

## Error handling

| Layer | Behavior |
|---|---|
| `plansHandler` | Cannot fail (no I/O). Returns 200 with the static-derived array. |
| `useBillingPlans()` | React Query default retry (3x). On persistent error, each consumer renders an inline error state. |
| `PricingPage` error state | Full-page: "Pricing unavailable — please refresh." |
| `OrganizationSignup` error state | Inline: "Could not load plans — please refresh." Plan selection step blocked until loaded. |
| `Billing.tsx` error state | Inline within plan comparison section: "Could not load plan details." Usage section unaffected (separate query). |
| `UpgradeModal` error state | Shows only the Enterprise / Contact Sales row as a safe fallback. |

---

## What does NOT change

- `billingService.ts` — `PLAN_TO_PRICE_ID` mapping stays as-is (uses `PRICE_IDS` from `stripe.ts`, not `constants/plans.ts`)
- `stripe.ts` — `PRICE_IDS` unchanged
- `middleware/usage.ts` — reads limits from the `Organization` DB record, not from `constants/plans.ts`
- Checkout flow — `useCreateCheckout` accepts `'STARTER' | 'PRO' | 'ENTERPRISE'`, no change
- Auth/tenant middleware — unaffected
- Stripe webhook — raw body router, unaffected

---

## Verification

```
npm.cmd run typecheck --prefix backend
npm.cmd run lint --prefix backend
npm.cmd run typecheck --prefix frontend
npm.cmd run lint --prefix frontend
```

---

## Acceptance criteria

- `GET /api/billing/plans` returns 200 without a Clerk session
- Response contains no `stripePriceId` values
- `priceCents` is `null` for ENTERPRISE and a number for all others
- Pricing page renders plan data from the API
- Signup plan selection renders plan data from the API
- Settings Billing renders labels/prices/features from the API
- Upgrade modal renders plan labels from the API
- Checkout still initiates for STARTER and PRO
- No local `PLANS`/`PLAN_DETAILS`/`PLAN_LABELS` constants remain in the four consumer files
- All four verification commands pass with no errors
