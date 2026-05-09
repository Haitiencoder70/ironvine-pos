# Billing Plan Catalog — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded plan display data across the frontend with a single backend-owned source of truth served via `GET /api/billing/plans`.

**Architecture:** Fix `constants/plans.ts` as the backend source of truth (rename `PROFESSIONAL`→`PRO`, set `ENTERPRISE.price = null`). Add a pure `plansHandler` that transforms the constant into a public-safe JSON response. Mount a new `publicBillingRouter` after `express.json` but before `clerkAuth`. Frontend consumes a new `useBillingPlans()` hook in four components.

**Tech Stack:** Express, TypeScript, Prisma (not touched), supertest (backend tests), React, React Query (`@tanstack/react-query`), Vitest + React Testing Library (frontend tests)

---

## File Map

| Action | Path | Change |
|---|---|---|
| Modify | `backend/src/constants/plans.ts` | Rename `PROFESSIONAL`→`PRO`, `ENTERPRISE.price: null` |
| Modify | `backend/src/controllers/billingController.ts` | Add `plansHandler` |
| Modify | `backend/src/routes/billing.ts` | Export `publicBillingRouter` |
| Modify | `backend/src/app.ts` | Mount `publicBillingRouter` |
| Create | `backend/src/tests/billing-plans.test.ts` | Integration tests for the new endpoint |
| Modify | `frontend/src/hooks/useBilling.ts` | Add `BillingPlan` type + `useBillingPlans()` |
| Modify | `frontend/src/pages/settings/Billing.tsx` | Drop `PLAN_DETAILS`/`PLAN_ORDER`, use hook |
| Modify | `frontend/src/pages/signup/PricingPage.tsx` | Drop local `PLANS`, use hook |
| Modify | `frontend/src/pages/signup/OrganizationSignup.tsx` | Drop local `PLANS`, use hook |
| Modify | `frontend/src/tests/pages/signup/OrganizationSignup.test.tsx` | Mock `useBillingPlans` |
| Modify | `frontend/src/components/UpgradeModal.tsx` | Drop `PLAN_LABELS`/`PLAN_ORDER`, use hook |

---

## Task 1: Fix `constants/plans.ts`

**Files:**
- Modify: `backend/src/constants/plans.ts`

This is the prerequisite for every other task. The current file has `PROFESSIONAL` as a key (wrong — Prisma enum uses `PRO`) and `ENTERPRISE.price: 199` (wrong — Enterprise is contact-sales, price is `null`).

- [ ] **Step 1: Replace the file**

```ts
// backend/src/constants/plans.ts
export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    stripePriceId: null as string | null,
    limits: {
      users: 1,
      ordersPerMonth: 50,
      inventoryItems: 200,
      customers: 100,
      storage: 500 * 1024 * 1024,
    },
    features: [
      'Basic order management',
      'Inventory tracking',
      'Customer management',
      'Email support',
    ],
  },
  STARTER: {
    name: 'Starter',
    price: 29,
    stripePriceId: process.env.STRIPE_PRICE_STARTER as string | undefined,
    limits: {
      users: 3,
      ordersPerMonth: 500,
      inventoryItems: 2000,
      customers: 1000,
      storage: 5 * 1024 * 1024 * 1024,
    },
    features: [
      'Everything in Free',
      'Custom branding',
      'Advanced reports',
      'Priority email support',
      '14-day free trial',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 79,
    stripePriceId: process.env.STRIPE_PRICE_PRO as string | undefined,
    popular: true,
    limits: {
      users: 10,
      ordersPerMonth: -1,
      inventoryItems: -1,
      customers: -1,
      storage: 50 * 1024 * 1024 * 1024,
    },
    features: [
      'Everything in Starter',
      'Unlimited orders',
      'API access',
      'Bulk operations',
      'Email automation',
      'Phone support',
      '14-day free trial',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: null,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE as string | undefined,
    limits: {
      users: -1,
      ordersPerMonth: -1,
      inventoryItems: -1,
      customers: -1,
      storage: 500 * 1024 * 1024 * 1024,
    },
    features: [
      'Everything in Pro',
      'White-label',
      'Custom domain',
      'Dedicated database',
      '24/7 priority support',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm.cmd run typecheck --prefix backend
```

Expected: no errors. If TypeScript complains about `price: null` with `as const`, it is because something downstream expected a `number`. Fix any such callers (there should be none — `constants/plans.ts` was previously unused by live billing logic).

- [ ] **Step 3: Commit**

```bash
git add backend/src/constants/plans.ts
git commit -m "fix(billing): rename PROFESSIONAL to PRO, set ENTERPRISE price to null"
```

---

## Task 2: Write the failing backend test

**Files:**
- Create: `backend/src/tests/billing-plans.test.ts`

Write the tests before implementing the handler. All tests must fail at this point because the endpoint does not exist.

- [ ] **Step 1: Create the test file**

```ts
// backend/src/tests/billing-plans.test.ts
import request from 'supertest';
import { app } from './helpers/app';

const mockGetAuth = jest.fn();
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => mockGetAuth(),
}));

beforeEach(() => {
  mockGetAuth.mockReturnValue({ userId: null, orgId: null, orgRole: null });
});

describe('GET /api/billing/plans — public endpoint', () => {
  it('returns 200 without a Clerk session', async () => {
    const res = await request(app).get('/api/billing/plans');
    expect(res.status).toBe(200);
  });

  it('returns a JSON array of 4 plans', async () => {
    const res = await request(app).get('/api/billing/plans');
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(4);
  });

  it('returns plans in order FREE → STARTER → PRO → ENTERPRISE', async () => {
    const res = await request(app).get('/api/billing/plans');
    expect(res.body.map((p: { key: string }) => p.key)).toEqual([
      'FREE', 'STARTER', 'PRO', 'ENTERPRISE',
    ]);
  });

  it('returns priceCents: 0 for FREE', async () => {
    const res = await request(app).get('/api/billing/plans');
    const free = res.body.find((p: { key: string }) => p.key === 'FREE');
    expect(free.priceCents).toBe(0);
  });

  it('returns priceCents: 2900 for STARTER', async () => {
    const res = await request(app).get('/api/billing/plans');
    const plan = res.body.find((p: { key: string }) => p.key === 'STARTER');
    expect(plan.priceCents).toBe(2900);
  });

  it('returns priceCents: 7900 for PRO', async () => {
    const res = await request(app).get('/api/billing/plans');
    const plan = res.body.find((p: { key: string }) => p.key === 'PRO');
    expect(plan.priceCents).toBe(7900);
  });

  it('returns priceCents: null for ENTERPRISE', async () => {
    const res = await request(app).get('/api/billing/plans');
    const plan = res.body.find((p: { key: string }) => p.key === 'ENTERPRISE');
    expect(plan.priceCents).toBeNull();
  });

  it('does not expose stripePriceId on any plan', async () => {
    const res = await request(app).get('/api/billing/plans');
    (res.body as Record<string, unknown>[]).forEach((plan) => {
      expect(plan).not.toHaveProperty('stripePriceId');
    });
  });

  it('marks PRO as popular: true', async () => {
    const res = await request(app).get('/api/billing/plans');
    const pro = res.body.find((p: { key: string }) => p.key === 'PRO');
    expect(pro.popular).toBe(true);
  });

  it('marks all non-PRO plans as popular: false', async () => {
    const res = await request(app).get('/api/billing/plans');
    const nonPro = (res.body as Array<{ key: string; popular: boolean }>).filter((p) => p.key !== 'PRO');
    nonPro.forEach((plan) => expect(plan.popular).toBe(false));
  });

  it('includes limits with users, ordersPerMonth, customers, inventoryItems', async () => {
    const res = await request(app).get('/api/billing/plans');
    (res.body as Record<string, unknown>[]).forEach((plan) => {
      const limits = plan.limits as Record<string, unknown>;
      expect(typeof limits.users).toBe('number');
      expect(typeof limits.ordersPerMonth).toBe('number');
      expect(typeof limits.customers).toBe('number');
      expect(typeof limits.inventoryItems).toBe('number');
    });
  });

  it('does not expose storage in limits', async () => {
    const res = await request(app).get('/api/billing/plans');
    (res.body as Record<string, unknown>[]).forEach((plan) => {
      const limits = plan.limits as Record<string, unknown>;
      expect(limits).not.toHaveProperty('storage');
    });
  });

  it('includes a non-empty features array for each plan', async () => {
    const res = await request(app).get('/api/billing/plans');
    (res.body as Record<string, unknown>[]).forEach((plan) => {
      expect(Array.isArray(plan.features)).toBe(true);
      expect((plan.features as unknown[]).length).toBeGreaterThan(0);
    });
  });

  it('includes active: true for each plan', async () => {
    const res = await request(app).get('/api/billing/plans');
    (res.body as Array<{ active: boolean }>).forEach((plan) => {
      expect(plan.active).toBe(true);
    });
  });

  it('includes stripePriceConfigured: boolean for each plan', async () => {
    const res = await request(app).get('/api/billing/plans');
    (res.body as Array<{ stripePriceConfigured: unknown }>).forEach((plan) => {
      expect(typeof plan.stripePriceConfigured).toBe('boolean');
    });
  });
});
```

- [ ] **Step 2: Run tests and confirm they all fail**

```bash
cd backend && npx jest billing-plans --no-coverage 2>&1 | tail -20
```

Expected: all tests fail with `404` or `Cannot GET /api/billing/plans`. This confirms the tests are wired up correctly before implementation.

---

## Task 3: Implement `plansHandler` in `billingController.ts`

**Files:**
- Modify: `backend/src/controllers/billingController.ts`

Add the import and the handler. No database or Stripe calls — purely transforms `PLANS` constant.

- [ ] **Step 1: Add import and handler**

At the top of `billingController.ts`, add the import after the existing imports:

```ts
import { PLANS } from '../constants/plans';
```

Then add these two items at the end of the file (before the closing, after `webhookHandler`):

```ts
function isStripePriceConfigured(priceId: string | null | undefined): boolean {
  return !!priceId && !priceId.startsWith('price_placeholder');
}

const PLAN_KEYS = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const;

export function plansHandler(_req: Request, res: Response): void {
  const plans = PLAN_KEYS.map((key) => {
    const plan = PLANS[key];
    return {
      key,
      label: plan.name,
      priceCents: typeof plan.price === 'number' ? plan.price * 100 : null,
      popular: key === 'PRO',
      active: true,
      stripePriceConfigured: isStripePriceConfigured(plan.stripePriceId),
      limits: {
        users: plan.limits.users,
        ordersPerMonth: plan.limits.ordersPerMonth,
        customers: plan.limits.customers,
        inventoryItems: plan.limits.inventoryItems,
      },
      features: [...plan.features],
    };
  });
  res.json(plans);
}
```

---

## Task 4: Wire up the public router

**Files:**
- Modify: `backend/src/routes/billing.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Add `publicBillingRouter` to `routes/billing.ts`**

Add `plansHandler` to the import from `billingController`, then export the new router. The full updated file:

```ts
// backend/src/routes/billing.ts
import { Router } from 'express';
import express from 'express';
import { authorize } from '../middleware/authorize';
import {
  checkoutHandler,
  portalHandler,
  usageHandler,
  webhookHandler,
  plansHandler,
} from '../controllers/billingController';

// Stripe webhook — raw body required, mounted BEFORE express.json in app.ts
export const billingWebhookRouter = Router();
billingWebhookRouter.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

// Public plans catalog — no auth, mounted AFTER express.json but BEFORE clerkAuth
export const publicBillingRouter = Router();
publicBillingRouter.get('/plans', plansHandler);

// Authenticated billing routes — mounted AFTER clerkAuth + injectTenant + requireAuth in app.ts
export const billingRouter = Router();
billingRouter.get('/usage',    authorize('billing:view'), usageHandler);
billingRouter.post('/checkout', authorize('billing:edit'), checkoutHandler);
billingRouter.post('/portal',  authorize('billing:view'), portalHandler);
```

- [ ] **Step 2: Mount `publicBillingRouter` in `app.ts`**

Find the block in `app.ts` that looks like this:

```ts
app.use('/api/billing', billingWebhookRouter);

app.use(express.json({ limit: '10mb' }));
app.use(sanitizeInput);

app.use('/api/tracking', trackingRouter);
app.use('/api/organization', publicInviteRouter);

app.use('/api', clerkAuth);
```

Add the import of `publicBillingRouter` to the existing billing import line:

```ts
import { billingRouter, billingWebhookRouter, publicBillingRouter } from './routes/billing';
```

Then change the block to:

```ts
app.use('/api/billing', billingWebhookRouter);

app.use(express.json({ limit: '10mb' }));
app.use(sanitizeInput);

app.use('/api/billing', publicBillingRouter);   // ← new line
app.use('/api/tracking', trackingRouter);
app.use('/api/organization', publicInviteRouter);

app.use('/api', clerkAuth);
```

- [ ] **Step 3: Run tests — all should now pass**

```bash
cd backend && npx jest billing-plans --no-coverage 2>&1 | tail -30
```

Expected: `Tests: 14 passed, 14 total`

- [ ] **Step 4: Run backend typecheck and lint**

```bash
npm.cmd run typecheck --prefix backend && npm.cmd run lint --prefix backend
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/constants/plans.ts backend/src/controllers/billingController.ts backend/src/routes/billing.ts backend/src/app.ts backend/src/tests/billing-plans.test.ts
git commit -m "feat(billing): add public GET /api/billing/plans endpoint"
```

---

## Task 5: Add `BillingPlan` type and `useBillingPlans()` hook

**Files:**
- Modify: `frontend/src/hooks/useBilling.ts`

- [ ] **Step 1: Add the interface and hook**

Open `frontend/src/hooks/useBilling.ts`. After the existing `BillingUsage` interface, add:

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
```

After the existing `useBillingUsage` function, add:

```ts
export function useBillingPlans() {
  return useQuery<BillingPlan[]>({
    queryKey: ['billing', 'plans'],
    queryFn: async () => {
      const res = await api.get<BillingPlan[]>('/billing/plans');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
```

No `enabled` guard — this is a public endpoint that works without a Clerk session.

- [ ] **Step 2: Verify typecheck**

```bash
npm.cmd run typecheck --prefix frontend
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useBilling.ts
git commit -m "feat(billing): add BillingPlan type and useBillingPlans hook"
```

---

## Task 6: Update `Billing.tsx`

**Files:**
- Modify: `frontend/src/pages/settings/Billing.tsx`

Drop the hardcoded `PLAN_DETAILS` and `PLAN_ORDER` constants. Add `useBillingPlans()`. Add a `badgeClass()` helper (style-only, not data).

- [ ] **Step 1: Replace the file**

```tsx
// frontend/src/pages/settings/Billing.tsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useBillingUsage,
  useBillingPlans,
  useCreateCheckout,
  useOpenPortal,
} from '@/hooks/useBilling';
import type { BillingPlan } from '@/hooks/useBilling';

function badgeClass(key: BillingPlan['key']): string {
  switch (key) {
    case 'FREE':       return 'bg-slate-500/15 text-slate-300';
    case 'STARTER':    return 'bg-blue-500/15 text-blue-300';
    case 'PRO':        return 'bg-purple-500/15 text-purple-300';
    case 'ENTERPRISE': return 'bg-amber-500/15 text-amber-300';
  }
}

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const isUnlimited = max === -1;
  const pct = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isWarning = !isUnlimited && pct >= 80;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className={isWarning ? 'text-red-400 font-medium' : 'text-slate-500'}>
          {isUnlimited ? `${current} / ∞` : `${current} / ${max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isWarning ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function BillingTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: billing, isLoading: billingLoading } = useBillingUsage();
  const { data: plans, isLoading: plansLoading, isError: plansError } = useBillingPlans();
  const checkout = useCreateCheckout();
  const portal = useOpenPortal();

  useEffect(() => {
    const status = searchParams.get('billing');
    if (status === 'success') {
      toast.success('Your plan has been updated!');
      setSearchParams({});
    } else if (status === 'canceled') {
      toast('Checkout canceled.', { icon: 'ℹ️' });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  if (billingLoading || !billing) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-white/[0.04] rounded w-40" />
        <div className="h-32 bg-white/[0.04] rounded-xl" />
        <div className="h-48 bg-white/[0.04] rounded-xl" />
      </div>
    );
  }

  const currentPlan = billing.plan;
  const needsBillingSetup = currentPlan !== 'FREE' && !billing.hasStripeSubscription;
  const currentPlanData = plans?.find((p) => p.key === currentPlan);

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      {/* Billing not connected warning */}
      {needsBillingSetup && currentPlanData && (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <span className="text-amber-400 text-lg shrink-0 mt-0.5">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">Billing not connected</p>
            <p className="text-sm text-amber-400/80 mt-0.5">
              This workspace is on the {currentPlanData.label} plan locally, but no active Stripe
              subscription is linked. Set up billing to keep access when limits apply.
            </p>
          </div>
          <button
            onClick={() => checkout.mutate(currentPlan as 'STARTER' | 'PRO')}
            disabled={checkout.isPending}
            className="min-h-[44px] px-4 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {checkout.isPending ? 'Loading…' : `Set up ${currentPlanData.label} billing`}
          </button>
        </div>
      )}

      {/* Current plan header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Current Plan</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeClass(currentPlan)}`}>
              {currentPlanData?.label ?? currentPlan}
            </span>
            {billing.subscriptionStatus && billing.subscriptionStatus !== 'active' && (
              <span className="text-sm text-red-600 capitalize font-medium">
                {billing.subscriptionStatus.replace('_', ' ')}
              </span>
            )}
          </div>
          {billing.trialEndsAt && new Date(billing.trialEndsAt) > new Date() && (
            <p className="text-sm text-amber-600 mt-1">
              Trial ends {new Date(billing.trialEndsAt).toLocaleDateString()}
            </p>
          )}
          {billing.subscriptionEndsAt && (
            <p className="text-sm text-red-600 mt-1">
              Access ends {new Date(billing.subscriptionEndsAt).toLocaleDateString()}
            </p>
          )}
        </div>
        {billing.hasStripeSubscription && (
          <button
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
            className="min-h-[44px] px-4 text-sm font-medium text-slate-300 border border-white/10 rounded-xl hover:bg-white/5 disabled:opacity-50 whitespace-nowrap"
          >
            {portal.isPending ? 'Opening…' : 'Manage Subscription'}
          </button>
        )}
      </div>

      {/* Usage */}
      <div className="glass-panel rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Usage</h3>
        <UsageBar label="Orders"           current={billing.usage.orders.current}         max={billing.usage.orders.max} />
        <UsageBar label="Customers"        current={billing.usage.customers.current}      max={billing.usage.customers.max} />
        <UsageBar label="Team Members"     current={billing.usage.users.current}          max={billing.usage.users.max} />
        <UsageBar label="Inventory Items"  current={billing.usage.inventoryItems.current} max={billing.usage.inventoryItems.max} />
      </div>

      {/* Plan comparison */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Plans</h3>

        {plansLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-white/[0.04] rounded-xl" />
            ))}
          </div>
        )}

        {plansError && (
          <p className="text-sm text-slate-500 py-4">Could not load plan details. Please refresh.</p>
        )}

        {plans && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => {
                const isCurrent = plan.key === currentPlan;
                const currentIdx = plans.findIndex((p) => p.key === currentPlan);
                const planIdx    = plans.findIndex((p) => p.key === plan.key);
                const isDowngrade  = planIdx < currentIdx;
                const isEnterprise = plan.key === 'ENTERPRISE';
                const isUpgrade    = !isCurrent && !isDowngrade && !isEnterprise;

                return (
                  <div
                    key={plan.key}
                    className={`glass-panel rounded-xl border p-5 flex flex-col gap-4 ${
                      isCurrent ? 'border-blue-500/60 ring-2 ring-blue-500/20' : 'border-white/10'
                    }`}
                  >
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass(plan.key)}`}>
                        {plan.label}
                      </span>
                      <p className="text-2xl font-bold text-slate-100 mt-2">
                        {plan.priceCents === null
                          ? 'Custom'
                          : plan.priceCents === 0
                          ? 'Free'
                          : `$${plan.priceCents / 100}/mo`}
                      </p>
                    </div>

                    <ul className="flex-1 space-y-1.5 text-sm text-slate-400">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrent && needsBillingSetup ? (
                      <button
                        onClick={() => checkout.mutate(plan.key as 'STARTER' | 'PRO')}
                        disabled={checkout.isPending}
                        className="min-h-[44px] text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {checkout.isPending ? 'Loading…' : 'Set up billing'}
                      </button>
                    ) : isCurrent ? (
                      <div className="min-h-[44px] flex items-center justify-center text-sm text-slate-500 border border-white/10 rounded-xl">
                        Current plan
                      </div>
                    ) : isEnterprise ? (
                      plan.stripePriceConfigured ? (
                        <button
                          onClick={() => checkout.mutate('ENTERPRISE')}
                          disabled={checkout.isPending}
                          className="min-h-[44px] flex items-center justify-center text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20"
                        >
                          Upgrade to Enterprise
                        </button>
                      ) : (
                        <a
                          href="mailto:sales@printflowpos.com"
                          className="min-h-[44px] flex items-center justify-center text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20"
                        >
                          Contact Sales
                        </a>
                      )
                    ) : isUpgrade ? (
                      <button
                        onClick={() => checkout.mutate(plan.key as 'STARTER' | 'PRO')}
                        disabled={checkout.isPending}
                        className="min-h-[44px] text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {checkout.isPending ? 'Loading…' : 'Upgrade'}
                      </button>
                    ) : (
                      <div className="min-h-[44px] flex items-center justify-center text-sm text-slate-500 border border-white/[0.06] rounded-xl">
                        Downgrade via portal
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              To downgrade, click "Manage Subscription" above to access the Stripe billing portal.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm.cmd run typecheck --prefix frontend
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/settings/Billing.tsx
git commit -m "feat(billing): Billing.tsx reads plan data from backend catalog"
```

---

## Task 7: Update `PricingPage.tsx`

**Files:**
- Modify: `frontend/src/pages/signup/PricingPage.tsx`

Drop the local `PLANS` array. The FAQ section and nav/footer are unchanged — only the plan card section changes.

- [ ] **Step 1: Replace the file**

```tsx
// frontend/src/pages/signup/PricingPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useBillingPlans } from '@/hooks/useBilling';
import type { BillingPlan } from '@/hooks/useBilling';

const FAQS = [
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade or downgrade at any time from your billing settings. Charges are prorated.',
  },
  {
    q: 'Is there a free trial?',
    a: 'The Free plan is a 14-day trial. Starter and Pro are paid upgrades when you are ready.',
  },
  {
    q: 'What happens when I hit a limit?',
    a: 'You will be notified and can upgrade immediately. Existing data is never deleted.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from the billing portal. You retain access until the period ends.',
  },
];

function getPricingCtaLabel(plan: BillingPlan, isSignedIn: boolean | undefined): string {
  if (isSignedIn && plan.key !== 'ENTERPRISE') return 'Go to dashboard';
  if (plan.key === 'FREE') return 'Start Free Trial';
  if (plan.key === 'ENTERPRISE') return plan.stripePriceConfigured ? 'Choose Enterprise' : 'Contact Sales';
  return `Choose ${plan.label}`;
}

export function PricingPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { data: plans, isLoading, isError } = useBillingPlans();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');

  const accountCtaPath = isSignedIn ? '/dashboard' : '/signup';

  function getDisplayPrice(priceCents: number | null): string {
    if (priceCents === null) return 'Custom';
    if (priceCents === 0) return 'Free';
    const monthly = priceCents / 100;
    const display = cycle === 'yearly' ? Math.round(monthly * 0.8) : monthly;
    return `$${display}/mo`;
  }

  function getYearlySavings(priceCents: number | null): number | null {
    if (priceCents === null || priceCents === 0 || cycle !== 'yearly') return null;
    return Math.round((priceCents / 100) * 12 * 0.2);
  }

  function handleSelect(plan: BillingPlan) {
    if (plan.key === 'ENTERPRISE' && !plan.stripePriceConfigured) {
      window.location.href = 'mailto:sales@printflowpos.com';
      return;
    }
    navigate(`/signup?plan=${plan.key}`);
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f5f5f5]">

      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-[#1a1a1a] bg-[#0f0f0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[44px] rounded-xl px-1"
          >
            <img src="/printflow-logo-horizontal-white.png" alt="PrintFlow POS" className="h-9 w-auto" />
          </button>
          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="hidden min-h-[44px] rounded-xl px-4 text-sm font-medium text-[#ff6b00] sm:inline-flex sm:items-center"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => navigate(isSignedIn ? '/dashboard' : '/sign-in')}
              className="min-h-[44px] rounded-xl px-4 text-sm font-medium text-[#777777] hover:text-[#f5f5f5]"
            >
              {isSignedIn ? 'Dashboard' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => navigate(accountCtaPath)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#ff6b00] px-4 text-sm font-semibold text-white hover:bg-[#e55f00]"
            >
              {isSignedIn ? 'Go to dashboard' : 'Start free trial'}
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </header>

      <main className="pt-20">

        {/* HERO */}
        <section className="px-4 pb-12 pt-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[3px] text-[#ff6b00]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b00]" />
              Pricing
            </div>
            <h1 className="text-[38px] font-extrabold leading-none tracking-[-1.5px] text-[#f5f5f5] sm:text-[50px] sm:tracking-[-2px]">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-5 max-w-[480px] text-[15px] leading-relaxed text-[#777777] sm:text-[17px]">
              Start with a 14-day free trial. Upgrade when you need more.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 inline-flex items-center rounded-xl border border-[#1e1e1e] bg-[#141414] p-1 gap-1">
              {(['monthly', 'yearly'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  className={`min-h-[40px] px-5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    cycle === c
                      ? 'bg-[#222222] text-[#f5f5f5] shadow-sm'
                      : 'text-[#555555] hover:text-[#999999]'
                  }`}
                >
                  {c}
                  {c === 'yearly' && (
                    <span className="ml-1.5 text-xs font-semibold text-[#ff6b00]">Save 20%</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* PLAN CARDS */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-5 pt-6 sm:grid-cols-2 lg:grid-cols-4">

              {isLoading && [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-96 rounded-2xl border border-[#1e1e1e] bg-[#141414] animate-pulse"
                />
              ))}

              {isError && (
                <div className="col-span-4 py-12 text-center">
                  <p className="text-[14px] text-[#555555]">Pricing unavailable — please refresh.</p>
                </div>
              )}

              {plans?.map((plan) => {
                const displayPrice = getDisplayPrice(plan.priceCents);
                const savings      = getYearlySavings(plan.priceCents);
                const ctaLabel     = getPricingCtaLabel(plan, isSignedIn);

                return (
                  <div
                    key={plan.key}
                    className={`relative flex flex-col rounded-2xl border p-6 transition-colors ${
                      plan.popular
                        ? 'border-[#ff6b00] bg-[#141414]'
                        : 'border-[#1e1e1e] bg-[#141414] hover:border-[#2e2e2e]'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#ff6b00] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                        Most Popular
                      </span>
                    )}

                    <div className="mb-5 min-h-[72px]">
                      <h3 className="text-[14px] font-semibold uppercase tracking-[2px] text-[#666666]">{plan.label}</h3>
                      <p className="mt-2 text-[34px] font-extrabold leading-none tracking-tight text-[#f5f5f5]">{displayPrice}</p>
                      {savings !== null && (
                        <p className="mt-1.5 text-[12px] font-medium text-[#ff6b00]">Save ${savings}/year</p>
                      )}
                    </div>

                    <ul className="mb-6 flex-1 space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-[13px] leading-snug text-[#888888]">
                          <span className="mt-px shrink-0 text-[#ff6b00]">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handleSelect(plan)}
                      className={`min-h-[44px] w-full rounded-xl text-sm font-semibold transition-colors ${
                        plan.popular
                          ? 'bg-[#ff6b00] text-white hover:bg-[#e55f00]'
                          : 'border border-[#2a2a2a] text-[#888888] hover:border-[#444444] hover:text-[#f5f5f5]'
                      }`}
                    >
                      {ctaLabel}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="mt-8 text-center text-[13px] text-[#444444]">
              All plans include SSL, automatic backups, and 99.9% uptime SLA.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <div className="border-t border-[#1a1a1a]" />
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="mb-3 border-l-2 border-[#ff6b00] pl-3 text-[11px] font-semibold uppercase tracking-[4px] text-[#ff6b00]">
              FAQ
            </p>
            <h2 className="mb-10 text-[26px] font-extrabold tracking-[-0.5px]">
              Frequently asked questions
            </h2>
            <div className="space-y-8">
              {FAQS.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="text-[15px] font-semibold text-[#f5f5f5]">{q}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#666666]">{a}</p>
                </div>
              ))}
            </div>
            <div className="mt-14 text-center">
              <p className="text-[14px] text-[#555555]">Enterprise or custom needs?</p>
              <a
                href="mailto:sales@printflowpos.com"
                className="mt-3 inline-flex min-h-[44px] items-center rounded-xl border border-[#2a2a2a] px-6 text-sm font-semibold text-[#888888] hover:border-[#444444] hover:text-[#f5f5f5]"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#1a1a1a] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => navigate('/')} className="min-h-[44px]">
            <img
              src="/printflow-logo-horizontal-white.png"
              alt="PrintFlow POS"
              className="h-7 w-auto opacity-40"
            />
          </button>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="min-h-[44px] text-[13px] text-[#555555] hover:text-[#f5f5f5]"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="min-h-[44px] text-[13px] text-[#ff6b00]"
            >
              Pricing
            </button>
            {(['Privacy', 'Terms'] as const).map((label) => (
              <span key={label} className="flex min-h-[44px] items-center text-[13px] text-[#555555]">
                {label}
              </span>
            ))}
          </nav>
          <p className="text-[12px] text-[#444444]">
            &copy; {new Date().getFullYear()} PrintFlow. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm.cmd run typecheck --prefix frontend
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/signup/PricingPage.tsx
git commit -m "feat(billing): PricingPage reads plan data from backend catalog"
```

---

## Task 8: Update `OrganizationSignup.tsx` and its test

**Files:**
- Modify: `frontend/src/pages/signup/OrganizationSignup.tsx`
- Modify: `frontend/src/tests/pages/signup/OrganizationSignup.test.tsx`

The component's step 2 currently maps over a local `PLANS` array. After this change it maps over the hook data. `PlanCard` expects `price: number | 'Custom'`, so we convert `priceCents: number | null` at the call site.

- [ ] **Step 1: Update OrganizationSignup.tsx**

Replace everything from the top of the file through line 68 (the `PLANS` array and supporting constants) with the following. Keep lines 70+ (component code) unchanged except where noted below.

The complete updated top section (imports, schemas, types, constants):

```tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SignUp, useAuth, useClerk } from '@clerk/clerk-react';
import { getAppUrl } from '../../utils/tenant';
import { z } from 'zod';
import { PlanCard } from '../../components/signup/PlanCard';
import { SubdomainChecker } from '../../components/signup/SubdomainChecker';
import { organizationApi } from '../../services/organizationApi';
import { getApiError } from '../../lib/api';
import { useBillingPlans } from '@/hooks/useBilling';
import type { BillingPlan } from '@/hooks/useBilling';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(2, 'Organization name is required'),
  slug: z.string().min(3, 'Must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  industry: z.string().min(1, 'Please select an industry'),
});

// ─── Types ───────────────────────────────────────────────────────────────────

const VALID_PLAN_KEYS = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const;
type PlanKey = typeof VALID_PLAN_KEYS[number];

interface FormState {
  name: string;
  slug: string;
  industry: string;
  plan: PlanKey;
  cycle: 'monthly' | 'yearly';
}

const INITIAL: FormState = {
  name: '', slug: '', industry: '',
  plan: 'FREE', cycle: 'monthly',
};

const INDUSTRIES = [
  'T-Shirts', 'Embroidery', 'Screen Printing', 'DTG Printing',
  'Sublimation', 'Embellishments', 'Promotional Products', 'Other',
];

// ─── Step indicators ─────────────────────────────────────────────────────────

function normalizePlan(plan: string | null): PlanKey {
  return VALID_PLAN_KEYS.includes(plan as PlanKey) ? (plan as PlanKey) : 'FREE';
}

function getPlanSelectLabel(planKey: BillingPlan['key'], selected: boolean): string {
  if (selected) return 'Selected';
  if (planKey === 'FREE') return 'Start Free Trial';
  if (planKey === 'ENTERPRISE') return 'Contact Sales';
  return `Select ${planKey.charAt(0) + planKey.slice(1).toLowerCase()}`;
}
```

In the `OrganizationSignup` function body, add the hook call immediately after the existing state declarations:

```tsx
const { data: plans, isLoading: plansLoading } = useBillingPlans();
```

Replace the step 2 plan grid JSX:

```tsx
{/* old code: {PLANS.map((plan) => ( ... ))} */}
```

With:

```tsx
{plansLoading && (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="h-48 rounded-2xl border border-white/10 bg-white/[0.04] animate-pulse" />
    ))}
  </div>
)}

{!plansLoading && (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {(plans ?? []).map((plan) => (
      <PlanCard
        key={plan.key}
        name={plan.label}
        price={plan.priceCents === null ? 'Custom' : plan.priceCents / 100}
        features={plan.features}
        popular={plan.popular}
        selected={form.plan === plan.key}
        billingCycle={form.cycle}
        ctaLabel={getPlanSelectLabel(plan.key, form.plan === plan.key)}
        ctaVariant={form.plan === plan.key ? 'disabled' : 'primary'}
        onSelect={() => {
          if (plan.key === 'ENTERPRISE') {
            window.location.href = 'mailto:sales@printflowpos.com';
            return;
          }
          set('plan', plan.key);
        }}
      />
    ))}
  </div>
)}
```

- [ ] **Step 2: Update `OrganizationSignup.test.tsx` — add `useBillingPlans` mock**

Add two things to the existing test file:

1. Add a mock for `@/hooks/useBilling` after the existing `vi.mock` blocks:

```ts
vi.mock('@/hooks/useBilling', () => ({
  useBillingPlans: vi.fn().mockReturnValue({
    data: [
      {
        key: 'FREE', label: 'Free Trial', priceCents: 0, popular: false,
        active: true, stripePriceConfigured: false,
        limits: { users: 1, ordersPerMonth: 50, customers: 100, inventoryItems: 200 },
        features: ['1 user', '50 orders/month'],
      },
      {
        key: 'STARTER', label: 'Starter', priceCents: 2900, popular: false,
        active: true, stripePriceConfigured: false,
        limits: { users: 3, ordersPerMonth: 500, customers: 1000, inventoryItems: 2000 },
        features: ['3 users', '500 orders/month'],
      },
      {
        key: 'PRO', label: 'Pro', priceCents: 7900, popular: true,
        active: true, stripePriceConfigured: false,
        limits: { users: 10, ordersPerMonth: -1, customers: -1, inventoryItems: -1 },
        features: ['10 users', 'Unlimited orders'],
      },
      {
        key: 'ENTERPRISE', label: 'Enterprise', priceCents: null, popular: false,
        active: true, stripePriceConfigured: false,
        limits: { users: -1, ordersPerMonth: -1, customers: -1, inventoryItems: -1 },
        features: ['Unlimited users'],
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));
```

2. Also update the `organizationApi` mock to include `findMine` so the useEffect in the component doesn't throw:

```ts
vi.mock('@/services/organizationApi', () => ({
  organizationApi: {
    checkSubdomain: vi.fn(),
    create: vi.fn(),
    findMine: vi.fn().mockResolvedValue(null),
  },
}));
```

- [ ] **Step 3: Run the existing OrganizationSignup tests to confirm they still pass**

```bash
cd frontend && npx vitest run src/tests/pages/signup/OrganizationSignup.test.tsx 2>&1 | tail -20
```

Expected: all tests pass (same assertions, now backed by mocked hook data).

- [ ] **Step 4: Verify typecheck**

```bash
npm.cmd run typecheck --prefix frontend
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/signup/OrganizationSignup.tsx frontend/src/tests/pages/signup/OrganizationSignup.test.tsx
git commit -m "feat(billing): OrganizationSignup reads plan data from backend catalog"
```

---

## Task 9: Update `UpgradeModal.tsx`

**Files:**
- Modify: `frontend/src/components/UpgradeModal.tsx`

Drop `PLAN_LABELS` and `PLAN_ORDER` constants. Add `useBillingPlans()`. Filter upgrade options by index position in the backend-ordered array (no re-declared order).

- [ ] **Step 1: Replace the file**

```tsx
// frontend/src/components/UpgradeModal.tsx
import { useNavigate } from 'react-router-dom';
import { useBillingUsage, useBillingPlans, useCreateCheckout, useOpenPortal } from '../hooks/useBilling';

interface UpgradeModalProps {
  onClose: () => void;
  message?: string;
}

const USAGE_LABELS: Record<string, string> = {
  orders:         'Orders',
  customers:      'Customers',
  users:          'Team Members',
  inventoryItems: 'Inventory Items',
};

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : Math.min((current / max) * 100, 100);
  const isFull = !unlimited && pct >= 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className={isFull ? 'text-red-600 font-semibold' : 'text-gray-500'}>
          {unlimited ? `${current} / ∞` : `${current} / ${max}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${isFull ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function UpgradeModal({ onClose, message }: UpgradeModalProps): React.JSX.Element {
  const navigate = useNavigate();
  const { data: billing, isLoading: billingLoading } = useBillingUsage();
  const { data: plans } = useBillingPlans();
  const checkout = useCreateCheckout();
  const portal = useOpenPortal();

  const currentPlan = billing?.plan ?? 'FREE';
  const currentIdx = plans?.findIndex((p) => p.key === currentPlan) ?? -1;

  const upgradePlans = plans?.filter((p, idx) => idx > currentIdx && p.key !== 'ENTERPRISE') ?? [];

  function handleUpgrade(planKey: 'STARTER' | 'PRO') {
    checkout.mutate(planKey, { onSuccess: onClose });
  }

  function handlePortal() {
    portal.mutate(undefined, { onSuccess: onClose });
  }

  function planLabel(priceCents: number | null, label: string): string {
    if (priceCents === null) return `${label} — Custom`;
    if (priceCents === 0)    return label;
    return `${label} — $${priceCents / 100}/mo`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Upgrade Your Plan</h2>
              <p className="text-sm text-blue-100 mt-0.5">
                {message ?? "You've reached a limit on your current plan."}
              </p>
            </div>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-blue-200 hover:text-white hover:bg-white/10"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Current usage */}
          {billingLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 bg-gray-100 rounded" />)}
            </div>
          ) : billing ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Usage</p>
              {Object.entries(billing.usage).map(([key, val]) => (
                <UsageBar
                  key={key}
                  label={USAGE_LABELS[key] ?? key}
                  current={val.current}
                  max={val.max}
                />
              ))}
            </div>
          ) : null}

          {/* Upgrade options */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Available Plans</p>
            {upgradePlans.map((plan) => (
              <button
                key={plan.key}
                onClick={() => handleUpgrade(plan.key as 'STARTER' | 'PRO')}
                disabled={checkout.isPending}
                className="w-full min-h-[48px] px-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                <span className="text-sm font-medium text-blue-900">
                  {planLabel(plan.priceCents, plan.label)}
                </span>
                <span className="text-xs text-blue-600">
                  {checkout.isPending ? 'Loading…' : 'Upgrade →'}
                </span>
              </button>
            ))}
            <a
              href="mailto:sales@printflowpos.com"
              className="w-full min-h-[48px] px-4 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">Enterprise — Custom</span>
              <span className="text-xs text-gray-500">Contact Sales →</span>
            </a>
          </div>

          {/* Manage existing subscription */}
          {currentPlan !== 'FREE' && (
            <button
              onClick={handlePortal}
              disabled={portal.isPending}
              className="w-full min-h-[44px] text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {portal.isPending ? 'Opening portal…' : 'Manage current subscription →'}
            </button>
          )}

          {/* View pricing page */}
          <button
            onClick={() => { navigate('/pricing'); onClose(); }}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Compare all plans
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm.cmd run typecheck --prefix frontend
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/UpgradeModal.tsx
git commit -m "feat(billing): UpgradeModal reads plan data from backend catalog"
```

---

## Task 10: Final verification

- [ ] **Step 1: Backend typecheck**

```bash
npm.cmd run typecheck --prefix backend
```

Expected: exit 0, no errors.

- [ ] **Step 2: Backend lint**

```bash
npm.cmd run lint --prefix backend
```

Expected: no errors or warnings.

- [ ] **Step 3: Frontend typecheck**

```bash
npm.cmd run typecheck --prefix frontend
```

Expected: exit 0, no errors.

- [ ] **Step 4: Frontend lint**

```bash
npm.cmd run lint --prefix frontend
```

Expected: no errors.

- [ ] **Step 5: Run all backend tests**

```bash
cd backend && npx jest --no-coverage 2>&1 | tail -20
```

Expected: billing-plans suite passes; no regressions in other suites.

- [ ] **Step 6: Run all frontend tests**

```bash
cd frontend && npx vitest run 2>&1 | tail -20
```

Expected: OrganizationSignup suite passes; no regressions.

- [ ] **Step 7: Verify no hardcoded plan data remains in the four consumer files**

```bash
grep -n "PLAN_DETAILS\|PLAN_LABELS\|PLAN_ORDER\|price: 29\|price: 79\|price: 199\|\$29/mo\|\$79/mo" \
  frontend/src/pages/settings/Billing.tsx \
  frontend/src/pages/signup/PricingPage.tsx \
  frontend/src/pages/signup/OrganizationSignup.tsx \
  frontend/src/components/UpgradeModal.tsx
```

Expected: no output. (The `$29/mo`-style strings will be gone; the only price references remaining are computed from `priceCents`.)
