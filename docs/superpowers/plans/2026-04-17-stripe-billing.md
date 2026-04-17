# Stripe Billing Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Stripe Checkout + Customer Portal billing so tenants can subscribe, upgrade, and manage their plan from the Settings page.

**Architecture:** Schema gains new fields/models for billing/invites/usage. A backend `billingService` talks to Stripe. A webhook endpoint at `POST /api/billing/webhook` (raw body, no auth) keeps the DB in sync. The frontend Settings page gains a Billing tab with plan comparison and upgrade/portal buttons.

**Tech Stack:** Stripe SDK v17 (already installed), Prisma, Express, React + TanStack Query, Zod, Tailwind

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `backend/src/config/env.ts` | Add Stripe price ID env vars |
| Modify | `.env.example` | Document new env vars |
| Modify | `backend/.env` | Add placeholder Stripe price IDs |
| Modify | `backend/prisma/schema.prisma` | All schema changes |
| Modify | `backend/src/types/index.ts` | Add STARTER to SUBSCRIPTION_LIMITS, add maxCustomers |
| Modify | `backend/src/middleware/limits.ts` | Add maxCustomers resource check |
| Create | `backend/src/services/billingService.ts` | Stripe checkout/portal/sync logic |
| Create | `backend/src/controllers/billingController.ts` | HTTP request handlers |
| Create | `backend/src/validators/billing.ts` | Zod schema for POST /billing/checkout |
| Create | `backend/src/routes/billing.ts` | Route definitions incl. webhook |
| Modify | `backend/src/app.ts` | Register billing router, raw body for webhook |
| Create | `frontend/src/hooks/useBilling.ts` | TanStack Query hooks for billing API |
| Create | `frontend/src/pages/settings/Billing.tsx` | Billing settings page |
| Modify | `frontend/src/pages/settings/Settings.tsx` | Add Billing tab |

---

## Task 1: Add Stripe price ID env vars

**Files:**
- Modify: `backend/src/config/env.ts`
- Modify: `.env.example`
- Modify: `backend/.env`

- [ ] **Step 1: Update `backend/src/config/env.ts`**

Replace the existing `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` block with:

```typescript
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
```

- [ ] **Step 2: Add to `.env.example`**

Add after `STRIPE_WEBHOOK_SECRET=whsec_...`:

```env
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

- [ ] **Step 3: Add placeholders to `backend/.env`**

Add after `STRIPE_WEBHOOK_SECRET`:

```env
STRIPE_PRICE_STARTER=price_placeholder_starter
STRIPE_PRICE_PRO=price_placeholder_pro
STRIPE_PRICE_ENTERPRISE=price_placeholder_enterprise
```

- [ ] **Step 4: Verify the backend still starts**

```bash
cd backend && npm run typecheck
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/config/env.ts .env.example backend/.env
git commit -m "chore: add Stripe price ID env vars"
```

---

## Task 2: Schema — Organization fields and new enums

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add STARTER to SubscriptionPlan enum**

Find the `enum SubscriptionPlan` block and replace it:

```prisma
enum SubscriptionPlan {
  FREE
  STARTER
  PRO
  ENTERPRISE
}
```

- [ ] **Step 2: Add ADMIN to UserRole enum**

Find the `enum UserRole` block and replace it:

```prisma
enum UserRole {
  OWNER
  ADMIN
  MANAGER
  STAFF
}
```

- [ ] **Step 3: Add missing fields to Organization model**

After the `subscriptionStatus` line, add:

```prisma
  trialEndsAt             DateTime?
  subscriptionEndsAt      DateTime?
  maxCustomers            Int                     @default(100)
  storageLimit            Int                     @default(524288000)
  customDomain            String?
  primaryColor            String?
  secondaryColor          String?
  settings                Json                    @default("{}")
```

Also add relations (at the end of the Organization model, before `@@map`):

```prisma
  organizationInvites     OrganizationInvite[]
  usageMetrics            UsageMetrics[]
  billingHistory          BillingHistory[]
```

- [ ] **Step 4: Add invite fields to User model**

After the `isActive` line in the User model, add:

```prisma
  isOrganizationOwner Boolean  @default(false)
  inviteToken         String?  @unique
  inviteAccepted      Boolean  @default(true)
  invitedBy           String?
```

- [ ] **Step 5: Commit schema enum + org changes**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(schema): add STARTER plan, ADMIN role, org billing fields, user invite fields"
```

---

## Task 3: Schema — New models

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add OrganizationInvite model**

Add after the `NotificationSetting` model:

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
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([email])
  @@map("organization_invites")
}
```

- [ ] **Step 2: Add UsageMetrics model**

Add after `OrganizationInvite`:

```prisma
model UsageMetrics {
  id             String       @id @default(cuid())
  organizationId String
  periodStart    DateTime
  periodEnd      DateTime
  orderCount     Int          @default(0)
  customerCount  Int          @default(0)
  inventoryCount Int          @default(0)
  userCount      Int          @default(0)
  storageUsed    Int          @default(0)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, periodStart])
  @@index([organizationId])
  @@map("usage_metrics")
}
```

- [ ] **Step 3: Add BillingHistory model**

Add after `UsageMetrics`:

```prisma
model BillingHistory {
  id             String            @id @default(cuid())
  organizationId String
  event          String
  fromPlan       SubscriptionPlan?
  toPlan         SubscriptionPlan?
  stripeEventId  String            @unique
  metadata       Json?
  createdAt      DateTime          @default(now())
  organization   Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, createdAt(sort: Desc)])
  @@map("billing_history")
}
```

- [ ] **Step 4: Commit new models**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(schema): add OrganizationInvite, UsageMetrics, BillingHistory models"
```

---

## Task 4: Run database migration

**Files:**
- Creates: `backend/prisma/migrations/<timestamp>_add_billing_and_invite_models/`

- [ ] **Step 1: Generate and apply migration**

```bash
cd backend && npx prisma migrate dev --name add_billing_invite_models
```

Expected output ends with:
```
Your database is now in sync with your schema.
✔ Generated Prisma Client
```

If you see a prompt about renaming fields, choose "No" and proceed.

- [ ] **Step 2: Verify Prisma client generated correctly**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Commit migration files**

```bash
git add backend/prisma/migrations backend/prisma/schema.prisma
git commit -m "feat(db): migration — billing fields, invite models, STARTER plan, ADMIN role"
```

---

## Task 5: Update SUBSCRIPTION_LIMITS and limits middleware

**Files:**
- Modify: `backend/src/types/index.ts`
- Modify: `backend/src/middleware/limits.ts`

- [ ] **Step 1: Replace SUBSCRIPTION_LIMITS in `backend/src/types/index.ts`**

Replace the entire `SUBSCRIPTION_LIMITS` constant:

```typescript
export const SUBSCRIPTION_LIMITS = {
  FREE:       { maxUsers: 1,  maxOrders: 100,  maxInventoryItems: 500,  maxCustomers: 100  },
  STARTER:    { maxUsers: 3,  maxOrders: 1000, maxInventoryItems: 2000, maxCustomers: 500  },
  PRO:        { maxUsers: 10, maxOrders: 5000, maxInventoryItems: 5000, maxCustomers: 2000 },
  ENTERPRISE: { maxUsers: -1, maxOrders: -1,   maxInventoryItems: -1,   maxCustomers: -1   },
} as const;
```

- [ ] **Step 2: Update `backend/src/middleware/limits.ts`**

Replace the entire file content:

```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { SUBSCRIPTION_LIMITS } from '../types';
import { AppError } from './errorHandler';
import { logger } from '../lib/logger';

type LimitableResource = 'orders' | 'inventoryItems' | 'users' | 'customers';

const RESOURCE_LIMIT_KEY: Record<LimitableResource, 'maxOrders' | 'maxInventoryItems' | 'maxUsers' | 'maxCustomers'> = {
  orders: 'maxOrders',
  inventoryItems: 'maxInventoryItems',
  users: 'maxUsers',
  customers: 'maxCustomers',
};

const RESOURCE_COUNT_QUERY = {
  orders: (orgDbId: string) => prisma.order.count({ where: { organizationId: orgDbId } }),
  inventoryItems: (orgDbId: string) => prisma.inventoryItem.count({ where: { organizationId: orgDbId } }),
  users: (orgDbId: string) => prisma.user.count({ where: { organizationId: orgDbId } }),
  customers: (orgDbId: string) => prisma.customer.count({ where: { organizationId: orgDbId } }),
} as const;

export function checkLimit(resource: LimitableResource) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const orgDbId = req.organizationDbId;
    if (!orgDbId) {
      return next(new AppError(500, 'Organization context missing', 'NO_ORG'));
    }

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgDbId },
        select: { plan: true },
      });

      if (!org) {
        return next(new AppError(404, 'Organization not found', 'ORG_NOT_FOUND'));
      }

      const limitKey = RESOURCE_LIMIT_KEY[resource];
      const maxValue = SUBSCRIPTION_LIMITS[org.plan][limitKey];

      if (maxValue === -1) {
        return next();
      }

      const current = await RESOURCE_COUNT_QUERY[resource](orgDbId);

      if (current >= maxValue) {
        return next(
          new AppError(
            403,
            `Plan limit reached: ${resource} (${current}/${maxValue}). Please upgrade your plan.`,
            'PLAN_LIMIT_REACHED',
          ),
        );
      }

      next();
    } catch (error) {
      logger.error('Failed to check plan limit', { error, resource, orgDbId });
      next(new AppError(500, 'Failed to enforce plan limits', 'LIMIT_CHECK_ERROR'));
    }
  };
}
```

- [ ] **Step 3: Verify types**

```bash
cd backend && npm run typecheck
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/types/index.ts backend/src/middleware/limits.ts
git commit -m "feat(billing): add STARTER plan limits and maxCustomers enforcement"
```

---

## Task 6: Create billingService

**Files:**
- Create: `backend/src/services/billingService.ts`

- [ ] **Step 1: Create `backend/src/services/billingService.ts`**

```typescript
import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';
import { SubscriptionPlan } from '@prisma/client';

const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-03-31.basil',
});

const PLAN_TO_PRICE_ID: Record<string, string | undefined> = {
  STARTER:    env.STRIPE_PRICE_STARTER,
  PRO:        env.STRIPE_PRICE_PRO,
  ENTERPRISE: env.STRIPE_PRICE_ENTERPRISE,
};

function stripeStatusToPlan(priceId: string | null | undefined): SubscriptionPlan {
  const entry = Object.entries(PLAN_TO_PRICE_ID).find(([, pid]) => pid === priceId);
  return (entry?.[0] as SubscriptionPlan) ?? 'FREE';
}

export async function createCheckoutSession(
  orgDbId: string,
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE',
  returnUrl: string,
): Promise<string> {
  const priceId = PLAN_TO_PRICE_ID[plan];
  if (!priceId || priceId.startsWith('price_placeholder')) {
    throw new AppError(503, 'Billing is not configured yet. Please add Stripe price IDs.', 'BILLING_NOT_CONFIGURED');
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgDbId },
    select: { id: true, name: true, stripeCustomerId: true },
  });
  if (!org) throw new AppError(404, 'Organization not found', 'ORG_NOT_FOUND');

  let customerId = org.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({ name: org.name, metadata: { orgDbId } });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: orgDbId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?billing=success`,
    cancel_url: `${returnUrl}?billing=canceled`,
    metadata: { orgDbId },
  });

  if (!session.url) throw new AppError(500, 'Failed to create Stripe session', 'STRIPE_ERROR');
  return session.url;
}

export async function createPortalSession(orgDbId: string, returnUrl: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: orgDbId },
    select: { stripeCustomerId: true },
  });
  if (!org) throw new AppError(404, 'Organization not found', 'ORG_NOT_FOUND');
  if (!org.stripeCustomerId) {
    throw new AppError(400, 'No active subscription found', 'NO_SUBSCRIPTION');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function syncSubscription(stripeEvent: Stripe.Event): Promise<void> {
  let subscription: Stripe.Subscription;

  if (stripeEvent.type === 'checkout.session.completed') {
    const checkoutSession = stripeEvent.data.object as Stripe.Checkout.Session;
    if (!checkoutSession.subscription) return;
    subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription as string);
  } else if (
    stripeEvent.type === 'customer.subscription.updated' ||
    stripeEvent.type === 'customer.subscription.deleted'
  ) {
    subscription = stripeEvent.data.object as Stripe.Subscription;
  } else {
    return;
  }

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const org = await prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true, plan: true },
  });
  if (!org) {
    logger.warn('syncSubscription: no org found for Stripe customer', { customerId });
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const newPlan = subscription.status === 'canceled' ? SubscriptionPlan.FREE : stripeStatusToPlan(priceId);
  const prevPlan = org.plan;

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: org.id },
      data: {
        plan: newPlan,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        subscriptionEndsAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      },
    }),
    prisma.billingHistory.create({
      data: {
        organizationId: org.id,
        event: stripeEvent.type,
        fromPlan: prevPlan,
        toPlan: newPlan,
        stripeEventId: stripeEvent.id,
        metadata: { subscriptionId: subscription.id, status: subscription.status },
      },
    }),
  ]);

  logger.info('Subscription synced', { orgId: org.id, prevPlan, newPlan, status: subscription.status });
}

export async function handlePaymentFailed(stripeEvent: Stripe.Event): Promise<void> {
  const invoice = stripeEvent.data.object as Stripe.Invoice;
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  await prisma.organization.updateMany({
    where: { stripeCustomerId: customerId },
    data: { subscriptionStatus: 'past_due' },
  });

  logger.warn('Payment failed — org marked past_due', { customerId });
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd backend && npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/billingService.ts
git commit -m "feat(billing): add billingService — checkout, portal, subscription sync"
```

---

## Task 7: Create billing validator, controller, and route

**Files:**
- Create: `backend/src/validators/billing.ts`
- Create: `backend/src/controllers/billingController.ts`
- Create: `backend/src/routes/billing.ts`

- [ ] **Step 1: Create `backend/src/validators/billing.ts`**

```typescript
import { z } from 'zod';

export const checkoutSchema = z.object({
  plan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']),
  returnUrl: z.string().url().optional(),
});

export const portalSchema = z.object({
  returnUrl: z.string().url().optional(),
});
```

- [ ] **Step 2: Create `backend/src/controllers/billingController.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import {
  createCheckoutSession,
  createPortalSession,
  syncSubscription,
  handlePaymentFailed,
} from '../services/billingService';
import { checkoutSchema, portalSchema } from '../validators/billing';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { logger } from '../lib/logger';

const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-03-31.basil',
});

export async function checkoutHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, parsed.error.message, 'VALIDATION_ERROR'));
    }

    const orgDbId = req.organizationDbId!;
    const defaultReturn = `${env.FRONTEND_URL}/settings/billing`;
    const returnUrl = parsed.data.returnUrl ?? defaultReturn;

    const url = await createCheckoutSession(orgDbId, parsed.data.plan, returnUrl);
    res.json({ url });
  } catch (error) {
    next(error);
  }
}

export async function portalHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = portalSchema.safeParse(req.body);
    const orgDbId = req.organizationDbId!;
    const defaultReturn = `${env.FRONTEND_URL}/settings/billing`;
    const returnUrl = parsed.success ? (parsed.data.returnUrl ?? defaultReturn) : defaultReturn;

    const url = await createPortalSession(orgDbId, returnUrl);
    res.json({ url });
  } catch (error) {
    next(error);
  }
}

export async function webhookHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sig = req.headers['stripe-signature'];
  const secret = env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    next(new AppError(400, 'Missing Stripe signature or webhook secret', 'WEBHOOK_ERROR'));
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch (err) {
    logger.error('Webhook signature verification failed', { err });
    next(new AppError(400, 'Webhook signature verification failed', 'WEBHOOK_SIGNATURE_ERROR'));
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event);
        break;
      default:
        logger.debug('Unhandled Stripe event', { type: event.type });
    }
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 3: Create `backend/src/routes/billing.ts`**

```typescript
import { Router, raw } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { checkoutHandler, portalHandler, webhookHandler } from '../controllers/billingController';

export const billingRouter = Router();

// Stripe webhook — raw body required for signature verification, NO auth middleware
billingRouter.post('/webhook', raw({ type: 'application/json' }), webhookHandler);

// Authenticated billing routes
billingRouter.use(requireAuth, injectTenant);
billingRouter.post('/checkout', checkoutHandler);
billingRouter.post('/portal', portalHandler);
```

- [ ] **Step 4: Verify types**

```bash
cd backend && npm run typecheck
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/validators/billing.ts backend/src/controllers/billingController.ts backend/src/routes/billing.ts
git commit -m "feat(billing): add billing validator, controller, and routes"
```

---

## Task 8: Register billing router in app.ts

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Import and register the billing router**

In `backend/src/app.ts`, add the import after the existing router imports:

```typescript
import { billingRouter } from './routes/billing';
```

Then add the route registration **before** the `clerkAuth` middleware block (because the webhook must be public). Add this immediately after the tracking router registration:

```typescript
// Billing webhook — must be before clerkAuth (no auth)
app.use('/api/billing', billingRouter);
```

> **Important:** The webhook route must be registered BEFORE `app.use('/api', clerkAuth)` so Stripe can POST to it without a Clerk token. The `billingRouter` handles this internally — the `/webhook` sub-route skips auth, the other sub-routes apply their own `requireAuth`.

- [ ] **Step 2: Verify the server starts**

```bash
cd backend && npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Test the webhook endpoint responds (without real Stripe)**

```bash
cd backend && npm run dev
# In a second terminal:
curl -X POST http://localhost:3001/api/billing/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Expected: `{"error":"Missing Stripe signature or webhook secret","code":"WEBHOOK_ERROR","statusCode":400}` — this is correct, it means the route is reachable and signature check is running.

- [ ] **Step 4: Commit**

```bash
git add backend/src/app.ts
git commit -m "feat(billing): register billing router in app"
```

---

## Task 9: Frontend — useBilling hook

**Files:**
- Create: `frontend/src/hooks/useBilling.ts`

- [ ] **Step 1: Create `frontend/src/hooks/useBilling.ts`**

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export interface BillingUsage {
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  usage: {
    orders: { current: number; max: number };
    customers: { current: number; max: number };
    users: { current: number; max: number };
    inventoryItems: { current: number; max: number };
  };
}

export function useBillingUsage() {
  return useQuery<BillingUsage>({
    queryKey: ['billing', 'usage'],
    queryFn: async () => {
      const res = await api.get<BillingUsage>('/billing/usage');
      return res.data;
    },
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (plan: 'STARTER' | 'PRO' | 'ENTERPRISE') => {
      const res = await api.post<{ url: string }>('/billing/checkout', { plan });
      return res.data.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => {
      toast.error('Failed to start checkout. Please try again.');
    },
  });
}

export function useOpenPortal() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ url: string }>('/billing/portal');
      return res.data.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => {
      toast.error('Failed to open billing portal. Please try again.');
    },
  });
}
```

- [ ] **Step 2: Add `/billing/usage` endpoint to backend**

This endpoint is needed by the hook above. Add to `backend/src/routes/billing.ts`, inside the authenticated section:

```typescript
import { usageHandler } from '../controllers/billingController';

// add this line after the portal route:
billingRouter.get('/usage', usageHandler);
```

Then add `usageHandler` to `backend/src/controllers/billingController.ts`:

```typescript
export async function usageHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;

    const [org, orderCount, customerCount, userCount, inventoryCount] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgDbId },
        select: { plan: true, subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true,
                  maxOrders: true, maxCustomers: true, maxUsers: true, maxInventoryItems: true },
      }),
      prisma.order.count({ where: { organizationId: orgDbId } }),
      prisma.customer.count({ where: { organizationId: orgDbId } }),
      prisma.user.count({ where: { organizationId: orgDbId } }),
      prisma.inventoryItem.count({ where: { organizationId: orgDbId } }),
    ]);

    if (!org) return next(new AppError(404, 'Organization not found', 'ORG_NOT_FOUND'));

    res.json({
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
      trialEndsAt: org.trialEndsAt,
      subscriptionEndsAt: org.subscriptionEndsAt,
      usage: {
        orders:        { current: orderCount,     max: org.maxOrders },
        customers:     { current: customerCount,  max: org.maxCustomers },
        users:         { current: userCount,      max: org.maxUsers },
        inventoryItems:{ current: inventoryCount, max: org.maxInventoryItems },
      },
    });
  } catch (error) {
    next(error);
  }
}
```

Also add the prisma import at the top of `billingController.ts`:

```typescript
import { prisma } from '../lib/prisma';
```

- [ ] **Step 3: Verify types**

```bash
cd backend && npm run typecheck
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useBilling.ts backend/src/routes/billing.ts backend/src/controllers/billingController.ts
git commit -m "feat(billing): add useBilling hooks and /billing/usage endpoint"
```

---

## Task 10: Frontend — Billing settings page

**Files:**
- Create: `frontend/src/pages/settings/Billing.tsx`

- [ ] **Step 1: Create `frontend/src/pages/settings/Billing.tsx`**

```typescript
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useBillingUsage, useCreateCheckout, useOpenPortal } from '@/hooks/useBilling';

const PLAN_ORDER = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const;
type Plan = typeof PLAN_ORDER[number];

const PLAN_DETAILS: Record<Plan, {
  label: string;
  price: string;
  color: string;
  features: string[];
}> = {
  FREE: {
    label: 'Free',
    price: '$0/mo',
    color: 'bg-gray-100 text-gray-700',
    features: ['1 user', '100 orders/mo', '100 customers', '500 inventory items', 'Community support'],
  },
  STARTER: {
    label: 'Starter',
    price: '$29/mo',
    color: 'bg-blue-100 text-blue-700',
    features: ['3 users', '1,000 orders/mo', '500 customers', '2,000 inventory items', 'Email support'],
  },
  PRO: {
    label: 'Pro',
    price: '$79/mo',
    color: 'bg-purple-100 text-purple-700',
    features: ['10 users', '5,000 orders/mo', '2,000 customers', '5,000 inventory items', 'Priority support'],
  },
  ENTERPRISE: {
    label: 'Enterprise',
    price: 'Custom',
    color: 'bg-amber-100 text-amber-700',
    features: ['Unlimited users', 'Unlimited orders', 'Unlimited customers', 'Unlimited inventory', 'Dedicated support'],
  },
};

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const pct = max === -1 ? 0 : Math.min((current / max) * 100, 100);
  const isUnlimited = max === -1;
  const isWarning = pct >= 80;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={isWarning ? 'text-red-600 font-medium' : 'text-gray-500'}>
          {isUnlimited ? `${current} / ∞` : `${current} / ${max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
  const { data: billing, isLoading } = useBillingUsage();
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

  if (isLoading || !billing) {
    return <div className="p-6 text-gray-400 text-sm">Loading billing info…</div>;
  }

  const currentPlan = billing.plan;
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      {/* Current plan header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${PLAN_DETAILS[currentPlan].color}`}>
              {PLAN_DETAILS[currentPlan].label}
            </span>
            {billing.subscriptionStatus && billing.subscriptionStatus !== 'active' && (
              <span className="text-sm text-red-600 capitalize">{billing.subscriptionStatus.replace('_', ' ')}</span>
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
        {currentPlan !== 'FREE' && (
          <button
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
          >
            {portal.isPending ? 'Opening…' : 'Manage Subscription'}
          </button>
        )}
      </div>

      {/* Usage */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Usage This Period</h3>
        <UsageBar label="Orders" current={billing.usage.orders.current} max={billing.usage.orders.max} />
        <UsageBar label="Customers" current={billing.usage.customers.current} max={billing.usage.customers.max} />
        <UsageBar label="Team Members" current={billing.usage.users.current} max={billing.usage.users.max} />
        <UsageBar label="Inventory Items" current={billing.usage.inventoryItems.current} max={billing.usage.inventoryItems.max} />
      </div>

      {/* Plan comparison */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_ORDER.map((plan, idx) => {
            const details = PLAN_DETAILS[plan];
            const isCurrent = plan === currentPlan;
            const isDowngrade = idx < currentIndex;
            const isEnterprise = plan === 'ENTERPRISE';

            return (
              <div
                key={plan}
                className={`rounded-xl border p-5 flex flex-col gap-4 ${
                  isCurrent ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                }`}
              >
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${details.color}`}>
                    {details.label}
                  </span>
                  <p className="text-xl font-bold text-gray-900 mt-2">{details.price}</p>
                </div>
                <ul className="flex-1 space-y-1 text-sm text-gray-600">
                  {details.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <span className="text-center text-sm text-gray-400 py-2">Current plan</span>
                ) : isEnterprise ? (
                  <a
                    href="mailto:sales@yourapp.com"
                    className="block text-center px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 min-h-[44px] flex items-center justify-center"
                  >
                    Contact Sales
                  </a>
                ) : (
                  <button
                    onClick={() => checkout.mutate(plan as 'STARTER' | 'PRO')}
                    disabled={checkout.isPending || isDowngrade}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {checkout.isPending ? 'Loading…' : isDowngrade ? 'Downgrade via Portal' : 'Upgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          To downgrade, use the "Manage Subscription" button above to access the billing portal.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd frontend && npm run typecheck 2>/dev/null || npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/settings/Billing.tsx frontend/src/hooks/useBilling.ts
git commit -m "feat(billing): add Billing settings page with plan comparison and usage bars"
```

---

## Task 11: Add Billing tab to Settings page

**Files:**
- Modify: `frontend/src/pages/settings/Settings.tsx`

- [ ] **Step 1: Import BillingTab**

Add import at the top of `frontend/src/pages/settings/Settings.tsx`:

```typescript
import { BillingTab } from './Billing';
```

- [ ] **Step 2: Add 'billing' to the Tab type**

Find the line:
```typescript
type Tab = 'general' | 'users' | 'tax' | 'notifications' | 'integrations' | 'modules';
```

Replace with:
```typescript
type Tab = 'general' | 'users' | 'tax' | 'notifications' | 'integrations' | 'modules' | 'billing';
```

- [ ] **Step 3: Add the tab to the TABS array**

Find the `TABS` array and add a billing entry after the integrations entry:

```typescript
  {
    id: 'billing',
    label: 'Billing',
    icon: <CreditCardIcon className="w-5 h-5" />,
  },
```

Also add the import for `CreditCardIcon` from `@heroicons/react/24/outline` if not already imported. Check the existing icon imports at the top of the file and add `CreditCardIcon` to the destructured list.

- [ ] **Step 4: Render BillingTab in the tab switcher**

Find the section that renders tab content (the big switch/if-else block for active tab). Add a billing case:

```typescript
{activeTab === 'billing' && <BillingTab />}
```

- [ ] **Step 5: Verify frontend builds**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/settings/Settings.tsx
git commit -m "feat(billing): add Billing tab to Settings page"
```

---

## Task 12: Update seed data for new schema

**Files:**
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Check what the seed currently creates**

```bash
head -60 backend/prisma/seed.ts
```

- [ ] **Step 2: Ensure the seed org includes new required fields**

Find the `organization.upsert` or `organization.create` call in `backend/prisma/seed.ts` and make sure it includes the new fields with defaults. Add any missing fields:

```typescript
// Inside the org create/upsert data block, add:
maxCustomers: 100,
storageLimit: 524288000,
settings: {},
```

If the seed creates users, ensure user records don't fail on the new `inviteAccepted` field (it defaults to `true`, so no change needed).

- [ ] **Step 3: Run the seed to verify it works**

```bash
cd backend && npm run db:seed
```

Expected: seed completes without errors

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "chore(seed): update seed data for billing schema changes"
```

---

## Self-Review Checklist

- [x] Spec: Organization fields (customDomain, primaryColor, secondaryColor, trialEndsAt, subscriptionEndsAt, maxCustomers, storageLimit, settings) → Task 2
- [x] Spec: STARTER enum added → Task 2
- [x] Spec: ADMIN role added → Task 2
- [x] Spec: User invite fields → Task 2
- [x] Spec: OrganizationInvite model → Task 3
- [x] Spec: UsageMetrics model → Task 3
- [x] Spec: BillingHistory model → Task 3
- [x] Spec: SUBSCRIPTION_LIMITS updated with STARTER + maxCustomers → Task 5
- [x] Spec: billingService (checkout, portal, sync) → Task 6
- [x] Spec: Webhook with raw body + signature verification → Task 7 + 8
- [x] Spec: POST /billing/checkout, POST /billing/portal, POST /billing/webhook → Tasks 7-8
- [x] Spec: invoice.payment_failed handler → Task 6 (handlePaymentFailed)
- [x] Spec: Billing tab with plan comparison, usage bars, upgrade buttons, portal button → Task 10
- [x] Spec: ?billing=success / ?billing=canceled toast handling → Task 10
- [x] Spec: env vars documented → Task 1
