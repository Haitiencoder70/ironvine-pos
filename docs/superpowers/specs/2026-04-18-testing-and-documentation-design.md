# Testing & Documentation Design
**Date:** 2026-04-18
**Status:** Approved

## Overview

Comprehensive testing suite and documentation for the T-Shirt POS multi-tenant SaaS. Implementation follows a backend-first phased approach: backend integration tests → frontend unit tests → Playwright E2E → documentation rewrites + scripts.

---

## 1. Backend Testing

### Stack
- `jest` + `ts-jest` — test runner and TypeScript execution
- `supertest` — HTTP assertions against Express app
- `@faker-js/faker` — deterministic fixture data

### Test Database
- **Docker Postgres** on port `5433` (separate from dev DB on `5432`)
- `docker-compose.test.yml` at root defines `tshirtpos_test` database
- Global Jest setup (`jest.setup.ts`): starts container → runs `prisma migrate deploy` → tears down after all suites
- Each test file: `beforeEach` truncates all tables, re-seeds minimal fixtures

### Shared Helpers (`/backend/src/tests/helpers/`)
| File | Purpose |
|---|---|
| `db.ts` | Prisma test client pointed at `TEST_DATABASE_URL` |
| `factories.ts` | Faker-powered builders: Organization, User, Order, Product, Customer |
| `app.ts` | Express app instance without `listen()` (for Supertest) |
| `auth.ts` | Generates Clerk JWT stubs for protected route testing |

### Test Files (`/backend/src/tests/`)

**`auth.test.ts`**
- Registration creates Organization + User rows
- Login returns valid JWT
- Invalid/expired token returns 401
- Organization creation enforces unique subdomain

**`tenant-isolation.test.ts`**
- Org A's resources are invisible to Org B's token
- Cross-tenant direct ID access returns 404 (not 403 — no data shape leakage)
- Requests with no org context are rejected by tenant middleware
- All major resource types covered: orders, customers, products, inventory, vendors

**`subscriptions.test.ts`**
- FREE plan blocks order creation at 100-order limit
- Stripe `customer.subscription.updated` webhook updates org plan in DB
- Stripe `customer.subscription.deleted` webhook downgrades org to FREE
- Downgrade enforces new lower limits immediately on next request

**`api.test.ts`**
- All 20+ route groups return correct HTTP status and response shape
- API key authentication works for public API routes
- Rate limiter returns 429 after threshold is exceeded
- Unauthenticated requests to protected routes return 401

**`permissions.test.ts`**
- STAFF role cannot delete orders, access billing, or manage users
- MANAGER role cannot access billing settings
- OWNER role has full access to all resources
- Each role tested against all permission-gated endpoints

---

## 2. Frontend Testing

### Stack
- `vitest` — test runner (native Vite integration, shares TS/alias config)
- `@testing-library/react` — component rendering and queries
- `@testing-library/user-event` — realistic user interaction simulation
- `jsdom` — browser environment

### Test Setup (`/frontend/src/tests/`)
| File | Purpose |
|---|---|
| `setup.ts` | Global mocks: Clerk hooks, react-hot-toast, offline store |
| `utils.tsx` | `renderWithProviders()` — wraps QueryClientProvider + router context |

### Test Files

**`components/TouchButton.test.tsx`**
- All variants render correctly (primary, secondary, danger, ghost)
- Click handler fires on interaction
- Loading state: spinner visible, click blocked
- Disabled state: click blocked, correct `aria-disabled` attribute
- Minimum 44×44px touch target enforced (CLAUDE.md non-negotiable rule)

**`hooks/usePlanLimits.test.ts`**
- `canCreateOrder()` returns `false` when org is at FREE plan limit
- `canCreateOrder()` returns `true` on PRO plan
- Correct upgrade prompt string returned with plan name
- Hook re-evaluates reactively when org plan changes

**`pages/signup/OrganizationSignup.test.tsx`**
- Multi-step navigation (Step 1 → 2 → 3) works correctly
- Subdomain field rejects spaces and uppercase characters
- Subdomain availability check calls API and shows taken/available feedback
- Incomplete step submission shows per-field validation errors
- Final submit sends correct payload to provisioning endpoint

### Scope Note
Full page renders for Orders, Dashboard, Inventory etc. are intentionally excluded — those are covered by E2E. Unit tests focus on pieces with real logic: form validation, plan limit hooks, and shared UI components.

---

## 3. E2E Testing (Playwright)

### Setup
- Installed at root: `npm install -D @playwright/test`
- `playwright.config.ts` at root
- Target: `http://localhost:5173` (frontend) + `http://localhost:3001` (backend)
- Browser: Chromium only (cross-browser added later)
- Global setup script seeds two demo orgs (`acme`, `riviera`) before suite; wipes after

### Clerk Integration
Uses Clerk's official testing tokens — bypasses real Clerk UI for deterministic, fast flows.

### Stripe Integration
Subscription spec uses Stripe test card `4242 4242 4242 4242`. Stripe CLI runs in webhook-forward mode so events reach the local backend during test execution.

### Spec Files (`/e2e/tests/`)

**`signup-flow.spec.ts`**
1. Land on marketing page
2. Click "Start Free"
3. Fill org name + subdomain
4. Complete Clerk signup
5. Redirect to `acme.localhost:5173`
6. Dashboard loads
7. Create first order
8. Order appears in list

**`multi-tenant.spec.ts`**
1. Log in as Acme user → create a customer
2. Log out → log in as Riviera user
3. Navigate to customers → Acme's customer not visible
4. Attempt direct URL access to Acme's customer ID → 404

**`subscription.spec.ts`**
- `TEST_FREE_ORDER_LIMIT=3` env var overrides the 100-order limit for test speed
1. Log in on FREE plan
2. Create 3 orders (hits the test limit)
3. Next order attempt shows upgrade modal
4. Use Stripe test card to upgrade to PRO
5. Limit lifted → create order 101 successfully
6. Downgrade back → orders above limit are read-only

---

## 4. Documentation

### Strategy
Existing stub files are rewritten in place. Three new files are added.

| File | Action | Content |
|---|---|---|
| `docs/SETUP.md` | Full rewrite | Node 22, Docker, env vars explained, migrations, seed, dev servers, common errors |
| `docs/DEPLOYMENT.md` | Full rewrite | Vercel setup, Neon provisioning, production env vars, Clerk prod instance, Stripe live keys, wildcard DNS |
| `docs/MULTI_TENANT.md` | New | Architecture overview, subdomain routing, organizationId flow, adding orgs manually, local isolation testing |
| `docs/API.md` | Full rewrite | Every route: method, path, auth required, request body, response shape, curl example |
| `docs/STRIPE.md` | New | Creating products/prices, mapping price IDs to plan constants, webhook setup, Stripe CLI, test cards |
| `docs/USER_GUIDE.md` | Full rewrite | Orders, Inventory, Customers, POS, Reports, Settings — written for non-technical shop owner |

---

## 5. Backend Scripts

### `backend/src/scripts/seed-multi-tenant.ts`
Creates 3 demo organizations for manual QA and E2E fixture use:
- `acme` — FREE plan, 5 products, 10 customers, 20 orders
- `riviera` — PRO plan, 15 products, 30 customers, 80 orders
- `blueprint` — ENTERPRISE plan, 30 products, 50 customers, 150 orders

### `backend/src/scripts/migrate-to-multi-tenant.ts`
Safety script for data created before multi-tenancy was enforced:
- Finds records with missing `organizationId`
- Creates a default org if none exists
- Assigns all orphaned records to default org
- Idempotent — safe to run multiple times

---

## Implementation Order

1. Backend test infrastructure (Docker compose, Jest config, helpers)
2. Backend test files (auth → tenant-isolation → subscriptions → api → permissions)
3. Frontend test infrastructure (Vitest config, setup, utils)
4. Frontend test files (TouchButton → usePlanLimits → OrganizationSignup)
5. Playwright setup + spec files
6. Documentation rewrites + new docs
7. Backend scripts (seed-multi-tenant, migrate-to-multi-tenant)

---

## Non-Negotiables (from CLAUDE.md)
- Every test that creates data must include `organizationId`
- No `// TODO` or partial test implementations
- Named exports only
- All test helpers use Zod-validated shapes matching production types
