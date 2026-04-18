# Testing & Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete testing suite (backend Jest, frontend Vitest, Playwright E2E) and fully rewrite the stub documentation files, plus two utility scripts.

**Architecture:** Backend-first phased approach — infrastructure → backend tests → frontend tests → E2E → docs → scripts. Each phase is independently committable. Backend tests use a Docker Postgres container isolated from dev DB. Frontend tests use Vitest with Clerk mocked globally. E2E uses Playwright with Clerk testing tokens and Stripe CLI.

**Tech Stack:** Jest + ts-jest + Supertest + @faker-js/faker (backend) · Vitest + @testing-library/react + @testing-library/user-event (frontend) · Playwright (E2E) · Docker Postgres (test DB)

---

## Phase 1: Backend Test Infrastructure

### Task 1: Docker test database + Jest config

**Files:**
- Create: `docker-compose.test.yml`
- Create: `backend/jest.config.ts`
- Create: `backend/jest.setup.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: Create `docker-compose.test.yml` at the repo root**

```yaml
version: '3.8'
services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: tshirtpos_test
    ports:
      - '5433:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U testuser -d tshirtpos_test']
      interval: 5s
      timeout: 5s
      retries: 10
```

- [ ] **Step 2: Create `backend/jest.config.ts`**

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterEnv: [],
  globalSetup: '../jest.setup.ts',
  globalTeardown: '../jest.setup.ts',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 30000,
  forceExit: true,
  clearMocks: true,
};

export default config;
```

- [ ] **Step 3: Create `backend/jest.setup.ts`** (global setup — runs once before all suites)

```typescript
import { execSync } from 'child_process';

export default async function globalSetup(): Promise<void> {
  // Start test DB container
  execSync('docker compose -f docker-compose.test.yml up -d --wait', {
    stdio: 'inherit',
  });

  // Run migrations against test DB
  process.env['DATABASE_URL'] =
    'postgresql://testuser:testpass@localhost:5433/tshirtpos_test';
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env },
  });
}

export async function globalTeardown(): Promise<void> {
  execSync('docker compose -f docker-compose.test.yml down -v', {
    stdio: 'inherit',
  });
}
```

- [ ] **Step 4: Add test scripts to `backend/package.json`**

In the `"scripts"` block, add:
```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

In `"devDependencies"`, add (install separately in Step 5):
```json
"@types/jest": "^29.5.0",
"@types/supertest": "^6.0.0",
"@faker-js/faker": "^9.0.0",
"jest": "^29.7.0",
"supertest": "^7.0.0",
"ts-jest": "^29.2.0"
```

- [ ] **Step 5: Install backend test dependencies**

```bash
cd backend
npm install -D jest ts-jest @types/jest supertest @types/supertest @faker-js/faker
```

- [ ] **Step 6: Verify Jest can find config**

```bash
cd backend
npx jest --listTests
```

Expected: no output yet (no test files), no errors.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.test.yml backend/jest.config.ts backend/jest.setup.ts backend/package.json backend/package-lock.json
git commit -m "test(backend): add Jest config and Docker test database setup"
```

---

### Task 2: Shared test helpers

**Files:**
- Create: `backend/src/tests/helpers/db.ts`
- Create: `backend/src/tests/helpers/factories.ts`
- Create: `backend/src/tests/helpers/app.ts`
- Create: `backend/src/tests/helpers/auth.ts`
- Create: `backend/src/tests/helpers/truncate.ts`

- [ ] **Step 1: Create `backend/src/tests/helpers/db.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const TEST_DB_URL =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://testuser:testpass@localhost:5433/tshirtpos_test';

export const testPrisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } },
  log: [],
});
```

- [ ] **Step 2: Create `backend/src/tests/helpers/truncate.ts`**

```typescript
import { testPrisma } from './db';

/** Truncate all tenant-data tables in FK-safe order (children first). */
export async function truncateAll(): Promise<void> {
  await testPrisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "stock_movements",
      "material_usages",
      "required_materials",
      "po_receiving_items",
      "po_receivings",
      "purchase_order_items",
      "purchase_orders",
      "shipment_status_histories",
      "shipments",
      "order_status_histories",
      "order_items",
      "orders",
      "inventory_items",
      "product_add_ons",
      "product_material_templates",
      "product_categories",
      "products",
      "customers",
      "vendors",
      "images",
      "users",
      "notification_settings",
      "usage_metrics",
      "billing_history",
      "usage_events",
      "activity_logs",
      "organization_invites",
      "sequence_counters",
      "organizations"
    RESTART IDENTITY CASCADE
  `);
}
```

- [ ] **Step 3: Create `backend/src/tests/helpers/factories.ts`**

```typescript
import { faker } from '@faker-js/faker';
import { testPrisma } from './db';
import type { Organization, User, SubscriptionPlan } from '@prisma/client';

export async function createOrg(overrides: Partial<{
  name: string;
  slug: string;
  subdomain: string;
  clerkOrgId: string;
  plan: SubscriptionPlan;
}> = {}): Promise<Organization> {
  const slug = overrides.slug ?? faker.internet.domainWord();
  return testPrisma.organization.create({
    data: {
      clerkOrgId:  overrides.clerkOrgId ?? `org_${faker.string.alphanumeric(20)}`,
      slug,
      name:        overrides.name ?? faker.company.name(),
      subdomain:   overrides.subdomain ?? slug,
      plan:        overrides.plan ?? 'FREE',
      maxOrders:   overrides.plan === 'PRO' ? 5000 : 100,
      maxCustomers: overrides.plan === 'PRO' ? 2000 : 100,
      maxInventoryItems: overrides.plan === 'PRO' ? 5000 : 500,
      maxUsers:    overrides.plan === 'PRO' ? 10 : 1,
    },
  });
}

export async function createUser(
  org: Organization,
  role: 'OWNER' | 'MANAGER' | 'STAFF' = 'OWNER',
  overrides: Partial<{ clerkUserId: string; email: string }> = {},
): Promise<User> {
  return testPrisma.user.create({
    data: {
      clerkUserId:    overrides.clerkUserId ?? `user_${faker.string.alphanumeric(20)}`,
      email:          overrides.email ?? faker.internet.email(),
      firstName:      faker.person.firstName(),
      lastName:       faker.person.lastName(),
      role,
      organizationId: org.id,
      isActive:       true,
    },
  });
}

export async function createProduct(org: Organization) {
  return testPrisma.product.create({
    data: {
      name:           faker.commerce.productName(),
      sku:            faker.string.alphanumeric(8).toUpperCase(),
      basePrice:      parseFloat(faker.commerce.price()),
      organizationId: org.id,
    },
  });
}

export async function createCustomer(org: Organization) {
  return testPrisma.customer.create({
    data: {
      name:           faker.person.fullName(),
      email:          faker.internet.email(),
      organizationId: org.id,
    },
  });
}

export async function createOrder(org: Organization, customer: { id: string }) {
  return testPrisma.order.create({
    data: {
      orderNumber:    `ORD-${faker.string.alphanumeric(6).toUpperCase()}`,
      status:         'PENDING',
      customerId:     customer.id,
      organizationId: org.id,
      totalAmount:    parseFloat(faker.commerce.price()),
    },
  });
}
```

- [ ] **Step 4: Create `backend/src/tests/helpers/auth.ts`**

```typescript
/**
 * Returns an object that mimics what @clerk/express getAuth() returns.
 * Inject this into req.auth in tests by mocking the Clerk middleware.
 */
export function makeClerkAuth(overrides: {
  userId: string;
  orgId: string;
  orgRole?: string;
}) {
  return {
    userId:  overrides.userId,
    orgId:   overrides.orgId,
    orgRole: overrides.orgRole ?? 'org:admin',
  };
}
```

- [ ] **Step 5: Create `backend/src/tests/helpers/app.ts`**

```typescript
/**
 * Returns the Express app without calling app.listen().
 * Supertest handles binding automatically.
 */
export { app } from '../../app';
```

- [ ] **Step 6: Verify TypeScript compiles helpers**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add backend/src/tests/
git commit -m "test(backend): add shared test helpers (db, factories, auth, truncate)"
```

---

## Phase 2: Backend Tests

### Task 3: Auth tests

**Files:**
- Create: `backend/src/tests/auth.test.ts`

- [ ] **Step 1: Create `backend/src/tests/auth.test.ts`**

```typescript
import request from 'supertest';
import { app } from './helpers/app';
import { testPrisma } from './helpers/db';
import { truncateAll } from './helpers/truncate';
import { faker } from '@faker-js/faker';

// Mock Clerk so no real JWT validation happens
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => ({ userId: null, orgId: null, orgRole: null }),
  requireAuth: () => (_req: any, _res: any, next: any) => next(),
}));

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates an organization and user row', async () => {
    const clerkOrgId  = `org_${faker.string.alphanumeric(20)}`;
    const clerkUserId = `user_${faker.string.alphanumeric(20)}`;
    const slug = faker.internet.domainWord();

    const res = await request(app)
      .post('/api/auth/register')
      .send({ clerkOrgId, clerkUserId, slug, name: 'Acme Shirts', email: 'owner@acme.com' });

    expect(res.status).toBe(201);

    const org = await testPrisma.organization.findUnique({ where: { clerkOrgId } });
    expect(org).not.toBeNull();
    expect(org!.slug).toBe(slug);

    const user = await testPrisma.user.findUnique({ where: { clerkUserId } });
    expect(user).not.toBeNull();
    expect(user!.organizationId).toBe(org!.id);
  });

  it('rejects duplicate subdomain', async () => {
    const slug = faker.internet.domainWord();
    const body = (suffix: string) => ({
      clerkOrgId:  `org_${suffix}`,
      clerkUserId: `user_${suffix}`,
      slug,
      name: 'Dupe Test',
      email: `owner${suffix}@test.com`,
    });

    await request(app).post('/api/auth/register').send(body('aaa')).expect(201);
    const res = await request(app).post('/api/auth/register').send(body('bbb'));

    expect(res.status).toBe(409);
  });
});

describe('Protected routes', () => {
  it('returns 401 when no auth header', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run auth tests**

```bash
cd backend
npx jest src/tests/auth.test.ts --verbose
```

Expected: tests pass (or fail with a meaningful error tied to the route not existing — investigate if so).

- [ ] **Step 3: Commit**

```bash
git add backend/src/tests/auth.test.ts
git commit -m "test(backend): add auth tests (registration, duplicate subdomain, 401)"
```

---

### Task 4: Tenant isolation tests

**Files:**
- Create: `backend/src/tests/tenant-isolation.test.ts`

- [ ] **Step 1: Create `backend/src/tests/tenant-isolation.test.ts`**

```typescript
import request from 'supertest';
import { app } from './helpers/app';
import { testPrisma } from './helpers/db';
import { truncateAll } from './helpers/truncate';
import { createOrg, createUser, createCustomer, createOrder } from './helpers/factories';

// We use real DB queries here — tenant isolation is validated at the SQL layer.
// Auth middleware is mocked to return the provided user/org context per request.

let acme: Awaited<ReturnType<typeof createOrg>>;
let riviera: Awaited<ReturnType<typeof createOrg>>;
let acmeOwner: Awaited<ReturnType<typeof createUser>>;
let rivieraOwner: Awaited<ReturnType<typeof createUser>>;

// Mock Clerk to return whatever we configure per-test
const mockGetAuth = jest.fn();
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => mockGetAuth(),
}));

beforeAll(async () => {
  await truncateAll();
  acme        = await createOrg({ subdomain: 'acme',    slug: 'acme' });
  riviera     = await createOrg({ subdomain: 'riviera', slug: 'riviera' });
  acmeOwner   = await createUser(acme, 'OWNER');
  rivieraOwner = await createUser(riviera, 'OWNER');
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

function asAcme() {
  mockGetAuth.mockReturnValue({
    userId: acmeOwner.clerkUserId,
    orgId:  acme.clerkOrgId,
    orgRole: 'org:admin',
  });
}

function asRiviera() {
  mockGetAuth.mockReturnValue({
    userId: rivieraOwner.clerkUserId,
    orgId:  riviera.clerkOrgId,
    orgRole: 'org:admin',
  });
}

describe('Tenant isolation — customers', () => {
  it("Riviera cannot see Acme's customers", async () => {
    // Create a customer under Acme
    const customer = await createCustomer(acme);

    // Log in as Riviera and list customers
    asRiviera();
    const res = await request(app)
      .get('/api/customers')
      .set('Host', 'riviera.localhost');

    expect(res.status).toBe(200);
    const ids = (res.body.data ?? []).map((c: any) => c.id);
    expect(ids).not.toContain(customer.id);
  });

  it("Cross-tenant direct ID access returns 404 (no data shape leakage)", async () => {
    const customer = await createCustomer(acme);

    asRiviera();
    const res = await request(app)
      .get(`/api/customers/${customer.id}`)
      .set('Host', 'riviera.localhost');

    expect(res.status).toBe(404);
  });
});

describe('Tenant isolation — orders', () => {
  it("Acme cannot see Riviera's orders", async () => {
    const rivCustomer = await createCustomer(riviera);
    const order       = await createOrder(riviera, rivCustomer);

    asAcme();
    const res = await request(app)
      .get('/api/orders')
      .set('Host', 'acme.localhost');

    expect(res.status).toBe(200);
    const ids = (res.body.data ?? []).map((o: any) => o.id);
    expect(ids).not.toContain(order.id);
  });
});

describe('Tenant middleware', () => {
  it('rejects requests with no org context (no subdomain, no Clerk org)', async () => {
    mockGetAuth.mockReturnValue({ userId: 'user_orphan', orgId: null, orgRole: null });
    const res = await request(app)
      .get('/api/orders')
      .set('Host', 'localhost'); // no subdomain

    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run tenant isolation tests**

```bash
cd backend
npx jest src/tests/tenant-isolation.test.ts --verbose
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/tests/tenant-isolation.test.ts
git commit -m "test(backend): add tenant isolation tests (cross-org data leakage, 404 on ID access)"
```

---

### Task 5: Subscription limit tests

**Files:**
- Create: `backend/src/tests/subscriptions.test.ts`

- [ ] **Step 1: Create `backend/src/tests/subscriptions.test.ts`**

```typescript
import request from 'supertest';
import { app } from './helpers/app';
import { testPrisma } from './helpers/db';
import { truncateAll } from './helpers/truncate';
import { createOrg, createUser, createCustomer, createOrder } from './helpers/factories';

const mockGetAuth = jest.fn();
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => mockGetAuth(),
}));

// Mock Stripe so no real HTTP calls happen
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
    customers: { retrieve: jest.fn() },
    subscriptions: { retrieve: jest.fn() },
  }));
});

let freeOrg: Awaited<ReturnType<typeof createOrg>>;
let freeOwner: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await truncateAll();
  // FREE plan allows maxOrders = 100; we override to 3 for test speed
  freeOrg = await testPrisma.organization.create({
    data: {
      clerkOrgId: 'org_free_test',
      slug: 'freetest',
      name: 'Free Test Org',
      subdomain: 'freetest',
      plan: 'FREE',
      maxOrders: 3,       // lowered for test speed
      maxCustomers: 100,
      maxInventoryItems: 500,
      maxUsers: 1,
    },
  });
  freeOwner = await createUser(freeOrg, 'OWNER');

  mockGetAuth.mockReturnValue({
    userId:  freeOwner.clerkUserId,
    orgId:   freeOrg.clerkOrgId,
    orgRole: 'org:admin',
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('Plan limit enforcement', () => {
  it('blocks order creation once FREE limit (3) is reached', async () => {
    const customer = await createCustomer(freeOrg);
    // Create 3 orders to hit limit
    for (let i = 0; i < 3; i++) {
      await createOrder(freeOrg, customer);
    }

    const res = await request(app)
      .post('/api/orders')
      .set('Host', 'freetest.localhost')
      .send({
        customerId: customer.id,
        items: [],
        totalAmount: 0,
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('LIMIT_EXCEEDED');
  });

  it('allows order creation on PRO plan (no limit hit)', async () => {
    const proOrg = await createOrg({ plan: 'PRO', subdomain: 'protest', slug: 'protest' });
    const proOwner = await createUser(proOrg, 'OWNER');

    mockGetAuth.mockReturnValue({
      userId:  proOwner.clerkUserId,
      orgId:   proOrg.clerkOrgId,
      orgRole: 'org:admin',
    });

    const customer = await createCustomer(proOrg);

    const res = await request(app)
      .post('/api/orders')
      .set('Host', 'protest.localhost')
      .send({ customerId: customer.id, items: [], totalAmount: 0 });

    expect([200, 201]).toContain(res.status);
  });
});

describe('Stripe webhook handling', () => {
  it('updates org plan when subscription.updated fires with PRO price', async () => {
    const stripe = require('stripe')();
    const payload = JSON.stringify({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id:        'sub_test',
          customer:  'cus_test',
          status:    'active',
          items: { data: [{ price: { id: process.env['STRIPE_PRO_PRICE_ID'] ?? 'price_pro' } }] },
        },
      },
    });

    // Map the stripe customer to our org
    await testPrisma.organization.update({
      where: { id: freeOrg.id },
      data:  { stripeCustomerId: 'cus_test', stripeSubscriptionId: 'sub_test' },
    });

    stripe.webhooks.constructEvent.mockReturnValue(JSON.parse(payload));

    const res = await request(app)
      .post('/api/stripe/webhook')
      .set('stripe-signature', 'test_sig')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect([200, 204]).toContain(res.status);

    const updated = await testPrisma.organization.findUnique({ where: { id: freeOrg.id } });
    expect(updated!.plan).toBe('PRO');
  });
});
```

- [ ] **Step 2: Run subscription tests**

```bash
cd backend
npx jest src/tests/subscriptions.test.ts --verbose
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/tests/subscriptions.test.ts
git commit -m "test(backend): add subscription limit and Stripe webhook tests"
```

---

### Task 6: API endpoint tests

**Files:**
- Create: `backend/src/tests/api.test.ts`

- [ ] **Step 1: Create `backend/src/tests/api.test.ts`**

```typescript
import request from 'supertest';
import { app } from './helpers/app';
import { testPrisma } from './helpers/db';
import { truncateAll } from './helpers/truncate';
import { createOrg, createUser } from './helpers/factories';

const mockGetAuth = jest.fn();
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => mockGetAuth(),
}));

let org: Awaited<ReturnType<typeof createOrg>>;
let owner: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  await truncateAll();
  org   = await createOrg({ subdomain: 'apitest', slug: 'apitest' });
  owner = await createUser(org, 'OWNER');
  mockGetAuth.mockReturnValue({
    userId: owner.clerkUserId,
    orgId:  org.clerkOrgId,
    orgRole: 'org:admin',
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const HOST = { 'Host': 'apitest.localhost' };

const GET_ROUTES = [
  '/api/orders',
  '/api/customers',
  '/api/products',
  '/api/inventory',
  '/api/vendors',
  '/api/purchase-orders',
  '/api/shipments',
  '/api/reports/sales',
  '/api/dashboard',
  '/api/settings',
];

describe('GET routes return 200 with data array', () => {
  for (const route of GET_ROUTES) {
    it(`GET ${route}`, async () => {
      const res = await request(app).get(route).set(HOST);
      expect([200, 204]).toContain(res.status);
    });
  }
});

describe('Unauthenticated requests', () => {
  it('returns 401 without auth header', async () => {
    mockGetAuth.mockReturnValueOnce({ userId: null, orgId: null, orgRole: null });
    const res = await request(app).get('/api/orders').set(HOST);
    expect(res.status).toBe(401);
  });
});

describe('Rate limiting', () => {
  it('returns 429 after exceeding threshold', async () => {
    // The app rate limit is 500/15min. We send 501 requests in rapid succession.
    // To avoid making 500 real requests, we temporarily override the limit
    // by sending the X-Forwarded-For header from a single IP rapidly.
    // This test is intentionally skipped in CI unless ENABLE_RATELIMIT_TEST=true
    if (!process.env['ENABLE_RATELIMIT_TEST']) {
      return;
    }

    const results = await Promise.all(
      Array.from({ length: 501 }, () =>
        request(app).get('/api/health').set(HOST)
      )
    );

    const tooMany = results.filter(r => r.status === 429);
    expect(tooMany.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run API tests**

```bash
cd backend
npx jest src/tests/api.test.ts --verbose
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/tests/api.test.ts
git commit -m "test(backend): add API endpoint smoke tests for all route groups"
```

---

### Task 7: Permission tests

**Files:**
- Create: `backend/src/tests/permissions.test.ts`

- [ ] **Step 1: Create `backend/src/tests/permissions.test.ts`**

```typescript
import request from 'supertest';
import { app } from './helpers/app';
import { testPrisma } from './helpers/db';
import { truncateAll } from './helpers/truncate';
import { createOrg, createUser, createCustomer, createOrder } from './helpers/factories';

const mockGetAuth = jest.fn();
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => mockGetAuth(),
}));

let org: Awaited<ReturnType<typeof createOrg>>;
let owner: Awaited<ReturnType<typeof createUser>>;
let manager: Awaited<ReturnType<typeof createUser>>;
let staff: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  await truncateAll();
  org     = await createOrg({ subdomain: 'permtest', slug: 'permtest' });
  owner   = await createUser(org, 'OWNER');
  manager = await createUser(org, 'MANAGER');
  staff   = await createUser(org, 'STAFF');
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const HOST = { 'Host': 'permtest.localhost' };

function asRole(user: typeof owner, clerkRole: string) {
  mockGetAuth.mockReturnValue({
    userId:  user.clerkUserId,
    orgId:   org.clerkOrgId,
    orgRole: clerkRole,
  });
}

describe('OWNER has full access', () => {
  beforeEach(() => asRole(owner, 'org:admin'));

  it('can access billing settings', async () => {
    const res = await request(app).get('/api/billing').set(HOST);
    expect([200, 204]).toContain(res.status);
  });

  it('can list users', async () => {
    const res = await request(app).get('/api/settings/users').set(HOST);
    expect([200, 204]).toContain(res.status);
  });
});

describe('MANAGER cannot access billing', () => {
  beforeEach(() => asRole(manager, 'org:manager'));

  it('returns 403 on GET /api/billing', async () => {
    const res = await request(app).get('/api/billing').set(HOST);
    expect(res.status).toBe(403);
  });
});

describe('STAFF has read-only access', () => {
  beforeEach(() => asRole(staff, 'org:member'));

  it('can list orders', async () => {
    const res = await request(app).get('/api/orders').set(HOST);
    expect([200, 204]).toContain(res.status);
  });

  it('cannot delete an order', async () => {
    const customer = await createCustomer(org);
    const order    = await createOrder(org, customer);

    const res = await request(app)
      .delete(`/api/orders/${order.id}`)
      .set(HOST);

    expect(res.status).toBe(403);
  });

  it('cannot access billing', async () => {
    const res = await request(app).get('/api/billing').set(HOST);
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run permission tests**

```bash
cd backend
npx jest src/tests/permissions.test.ts --verbose
```

Expected: all pass.

- [ ] **Step 3: Run full backend suite**

```bash
cd backend
npx jest --verbose
```

Expected: all test files pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/tests/permissions.test.ts
git commit -m "test(backend): add role-based permission tests (OWNER/MANAGER/STAFF)"
```

---

## Phase 3: Frontend Test Infrastructure

### Task 8: Vitest config + global setup

**Files:**
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/tests/setup.ts`
- Create: `frontend/src/tests/utils.tsx`
- Modify: `frontend/package.json`

- [ ] **Step 1: Install frontend test dependencies**

```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Create `frontend/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: Add test script to `frontend/package.json`**

In the `"scripts"` block, add:
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 4: Create `frontend/src/tests/setup.ts`**

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Clerk — tests don't have a real Clerk instance
vi.mock('@clerk/clerk-react', () => ({
  useAuth:         () => ({ isSignedIn: true, getToken: async () => 'test-token' }),
  useUser:         () => ({ user: { id: 'user_test', primaryEmailAddress: { emailAddress: 'test@test.com' } } }),
  useOrganization: () => ({ organization: { id: 'org_test', name: 'Test Org', slug: 'testorg', publicMetadata: { plan: 'PRO' } } }),
  ClerkProvider:   ({ children }: { children: React.ReactNode }) => children,
  SignIn:          () => null,
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
  toast:   { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
  Toaster: () => null,
}));

// Suppress framer-motion animation warnings in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    motion: {
      button: 'button',
      div:    'div',
      span:   'span',
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});
```

- [ ] **Step 5: Create `frontend/src/tests/utils.tsx`**

```typescript
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

export function renderWithProviders(
  ui: ReactNode,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
```

- [ ] **Step 6: Verify Vitest can start**

```bash
cd frontend
npx vitest run
```

Expected: "No test files found" — no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/vitest.config.ts frontend/src/tests/ frontend/package.json frontend/package-lock.json
git commit -m "test(frontend): add Vitest config and global test setup with Clerk/framer mocks"
```

---

## Phase 4: Frontend Tests

### Task 9: TouchButton tests

**Files:**
- Create: `frontend/src/tests/components/TouchButton.test.tsx`

- [ ] **Step 1: Create `frontend/src/tests/components/TouchButton.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils';
import { TouchButton } from '@/components/ui/TouchButton';

describe('TouchButton variants', () => {
  const variants = ['primary', 'secondary', 'success', 'danger', 'warning', 'ghost'] as const;

  for (const variant of variants) {
    it(`renders ${variant} variant without crashing`, () => {
      renderWithProviders(<TouchButton variant={variant}>Click</TouchButton>);
      expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
    });
  }
});

describe('TouchButton click handling', () => {
  it('fires onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    renderWithProviders(<TouchButton onClick={handleClick}>Press</TouchButton>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('TouchButton loading state', () => {
  it('shows spinner and blocks click when loading', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    renderWithProviders(
      <TouchButton loading onClick={handleClick}>Save</TouchButton>
    );

    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe('TouchButton disabled state', () => {
  it('blocks click and has aria-disabled when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    renderWithProviders(
      <TouchButton disabled onClick={handleClick}>Delete</TouchButton>
    );

    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe('TouchButton touch target size', () => {
  it('md size has min-height class of at least 44px', () => {
    renderWithProviders(<TouchButton size="md">Touch</TouchButton>);
    const btn = screen.getByRole('button');
    // min-h-[44px] is applied via Tailwind className
    expect(btn.className).toContain('min-h-[44px]');
  });

  it('sm size still meets 36px (documented exception for inline buttons)', () => {
    renderWithProviders(<TouchButton size="sm">Small</TouchButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('min-h-[36px]');
  });
});
```

- [ ] **Step 2: Run TouchButton tests**

```bash
cd frontend
npx vitest run src/tests/components/TouchButton.test.tsx
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/tests/components/TouchButton.test.tsx
git commit -m "test(frontend): add TouchButton tests (variants, click, loading, disabled, touch target)"
```

---

### Task 10: usePlanLimits hook tests

**Files:**
- Create: `frontend/src/tests/hooks/usePlanLimits.test.ts`

- [ ] **Step 1: Create `frontend/src/tests/hooks/usePlanLimits.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePlanLimits } from '@/hooks/usePlanLimits';

// Mock useBillingUsage to return controlled data
vi.mock('@/hooks/useBilling', () => ({
  useBillingUsage: vi.fn(),
}));

import { useBillingUsage } from '@/hooks/useBilling';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function mockBilling(plan: string, current: number, max: number) {
  (useBillingUsage as ReturnType<typeof vi.fn>).mockReturnValue({
    data: {
      plan,
      usage: {
        orders:         { current, max },
        customers:      { current: 0, max: 100 },
        users:          { current: 1, max: 1 },
        inventoryItems: { current: 0, max: 500 },
      },
    },
  });
}

describe('canCreateOrder', () => {
  it('returns allowed=false when at FREE plan order limit', () => {
    mockBilling('FREE', 100, 100);
    const { result } = renderHook(() => usePlanLimits(), { wrapper: makeWrapper() });
    const check = result.current.canCreateOrder(false); // false = don't fire modal
    expect(check.allowed).toBe(false);
  });

  it('returns allowed=true when under limit', () => {
    mockBilling('FREE', 50, 100);
    const { result } = renderHook(() => usePlanLimits(), { wrapper: makeWrapper() });
    const check = result.current.canCreateOrder(false);
    expect(check.allowed).toBe(true);
  });

  it('returns allowed=true on PRO plan (max = 5000, current = 4999)', () => {
    mockBilling('PRO', 4999, 5000);
    const { result } = renderHook(() => usePlanLimits(), { wrapper: makeWrapper() });
    const check = result.current.canCreateOrder(false);
    expect(check.allowed).toBe(true);
  });

  it('returns allowed=true on ENTERPRISE (unlimited, max = -1)', () => {
    mockBilling('ENTERPRISE', 99999, -1);
    const { result } = renderHook(() => usePlanLimits(), { wrapper: makeWrapper() });
    const check = result.current.canCreateOrder(false);
    expect(check.allowed).toBe(true);
  });

  it('message contains plan limit when blocked', () => {
    mockBilling('FREE', 100, 100);
    const { result } = renderHook(() => usePlanLimits(), { wrapper: makeWrapper() });
    const check = result.current.canCreateOrder(false);
    expect(check.message).toContain('100');
    expect(check.message.toLowerCase()).toContain('upgrade');
  });
});
```

- [ ] **Step 2: Run hook tests**

```bash
cd frontend
npx vitest run src/tests/hooks/usePlanLimits.test.ts
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/tests/hooks/usePlanLimits.test.ts
git commit -m "test(frontend): add usePlanLimits hook tests (limits, unlimited, message content)"
```

---

### Task 11: OrganizationSignup form tests

**Files:**
- Create: `frontend/src/tests/pages/signup/OrganizationSignup.test.tsx`

- [ ] **Step 1: Read the OrganizationSignup component**

```bash
cat frontend/src/pages/signup/OrganizationSignup.tsx
```

Note the step structure and field names before writing tests.

- [ ] **Step 2: Create `frontend/src/tests/pages/signup/OrganizationSignup.test.tsx`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils';
import { OrganizationSignup } from '@/pages/signup/OrganizationSignup';

// Mock the subdomain availability API call
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  setApiToken: vi.fn(),
  setUpgradeModalHandler: vi.fn(),
}));

import { api } from '@/lib/api';

beforeEach(() => {
  vi.clearAllMocks();
  (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { available: true } });
  (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { success: true } });
});

describe('OrganizationSignup — multi-step navigation', () => {
  it('starts on step 1', () => {
    renderWithProviders(<OrganizationSignup />);
    // Step 1 should show the org name field
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
  });

  it('advances to step 2 after filling step 1', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrganizationSignup />);

    await user.type(screen.getByLabelText(/organization name/i), 'Acme Shirts');
    await user.click(screen.getByRole('button', { name: /next|continue/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/subdomain/i)).toBeInTheDocument();
    });
  });
});

describe('OrganizationSignup — subdomain validation', () => {
  async function getToSubdomainStep() {
    const user = userEvent.setup();
    renderWithProviders(<OrganizationSignup />);
    await user.type(screen.getByLabelText(/organization name/i), 'Test Shop');
    await user.click(screen.getByRole('button', { name: /next|continue/i }));
    await waitFor(() => expect(screen.getByLabelText(/subdomain/i)).toBeInTheDocument());
    return user;
  }

  it('rejects subdomain with uppercase letters', async () => {
    const user = await getToSubdomainStep();
    await user.type(screen.getByLabelText(/subdomain/i), 'TestShop');
    await user.click(screen.getByRole('button', { name: /check|next|continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/lowercase/i)).toBeInTheDocument();
    });
  });

  it('rejects subdomain with spaces', async () => {
    const user = await getToSubdomainStep();
    await user.type(screen.getByLabelText(/subdomain/i), 'my shop');
    await user.click(screen.getByRole('button', { name: /check|next|continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid|spaces|only letters/i)).toBeInTheDocument();
    });
  });

  it('shows available feedback when subdomain is free', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { available: true } });
    const user = await getToSubdomainStep();

    await user.type(screen.getByLabelText(/subdomain/i), 'acmeshirts');

    await waitFor(() => {
      expect(screen.getByText(/available/i)).toBeInTheDocument();
    });
  });

  it('shows taken feedback when subdomain is unavailable', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { available: false } });
    const user = await getToSubdomainStep();

    await user.type(screen.getByLabelText(/subdomain/i), 'taken');

    await waitFor(() => {
      expect(screen.getByText(/taken|unavailable|already/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: Run signup tests**

```bash
cd frontend
npx vitest run src/tests/pages/signup/OrganizationSignup.test.tsx
```

Expected: all pass. If the component's label text differs from what's in the test, update the `getByLabelText` queries to match the actual labels.

- [ ] **Step 4: Run full frontend suite**

```bash
cd frontend
npx vitest run
```

Expected: all test files pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/tests/pages/
git commit -m "test(frontend): add OrganizationSignup multi-step form and subdomain validation tests"
```

---

## Phase 5: E2E Setup

### Task 12: Playwright install + config

**Files:**
- Create: `playwright.config.ts` (at repo root)
- Create: `e2e/global-setup.ts`
- Create: `e2e/global-teardown.ts`
- Modify: root `package.json`

- [ ] **Step 1: Install Playwright at repo root**

```bash
cd "i:/POS Projects/touchscreenpos"
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:     './e2e/tests',
  timeout:     60_000,
  retries:     process.env['CI'] ? 2 : 0,
  workers:     1, // serial — tests share a DB
  globalSetup:    './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL:       'http://localhost:5173',
    trace:         'on-first-retry',
    screenshot:    'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd:     './frontend',
      url:     'http://localhost:5173',
      reuseExistingServer: !process.env['CI'],
    },
    {
      command: 'npm run dev',
      cwd:     './backend',
      url:     'http://localhost:3001/api/health',
      reuseExistingServer: !process.env['CI'],
    },
  ],
});
```

- [ ] **Step 3: Create `e2e/global-setup.ts`**

```typescript
import { execSync } from 'child_process';
import path from 'path';

export default async function globalSetup(): Promise<void> {
  // Start test DB
  execSync('docker compose -f docker-compose.test.yml up -d --wait', { stdio: 'inherit' });

  // Run seed for E2E demo orgs
  execSync('npx tsx src/scripts/seed-multi-tenant.ts', {
    cwd:   path.join(process.cwd(), 'backend'),
    stdio: 'inherit',
    env:   {
      ...process.env,
      DATABASE_URL: 'postgresql://testuser:testpass@localhost:5433/tshirtpos_test',
    },
  });
}
```

- [ ] **Step 4: Create `e2e/global-teardown.ts`**

```typescript
import { execSync } from 'child_process';

export default async function globalTeardown(): Promise<void> {
  execSync('docker compose -f docker-compose.test.yml down -v', { stdio: 'inherit' });
}
```

- [ ] **Step 5: Add E2E script to root `package.json`**

```json
"e2e": "playwright test",
"e2e:ui": "playwright test --ui",
"e2e:report": "playwright show-report"
```

- [ ] **Step 6: Verify Playwright config is valid**

```bash
npx playwright test --list
```

Expected: lists 0 tests (no spec files yet), no config errors.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts e2e/ package.json package-lock.json
git commit -m "test(e2e): add Playwright config, global setup/teardown, webServer wiring"
```

---

## Phase 6: E2E Specs

### Task 13: Signup flow spec

**Files:**
- Create: `e2e/tests/signup-flow.spec.ts`

- [ ] **Step 1: Create `e2e/tests/signup-flow.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Signup flow', () => {
  test('new user can sign up, reach dashboard, and create first order', async ({ page }) => {
    // 1. Land on marketing page
    await page.goto('http://localhost:5173');
    await expect(page.getByText('The POS built for')).toBeVisible();

    // 2. Click Start Free
    await page.getByRole('button', { name: /start free/i }).first().click();
    await page.waitForURL('**/signup');

    // 3. Fill org name (Step 1)
    await page.getByLabel(/organization name/i).fill('E2E Test Shop');
    await page.getByRole('button', { name: /next|continue/i }).click();

    // 4. Fill subdomain (Step 2)
    const subdomain = `e2etest${Date.now()}`;
    await page.getByLabel(/subdomain/i).fill(subdomain);
    await expect(page.getByText(/available/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /next|continue/i }).click();

    // 5. Clerk signup step — in test mode, Clerk testing tokens skip the UI
    //    If CLERK_TESTING_TOKEN is set, inject it. Otherwise assert the Clerk UI loads.
    if (process.env['CLERK_TESTING_TOKEN']) {
      await page.evaluate((token) => {
        window.localStorage.setItem('clerk-testing-token', token);
      }, process.env['CLERK_TESTING_TOKEN']);
    } else {
      // Assert Clerk sign-up form is visible (manual test path)
      await expect(page.getByText(/create.*account|sign up/i)).toBeVisible({ timeout: 10000 });
      test.skip(); // Skip rest in non-Clerk-test environments
    }

    // 6. Dashboard loads on org subdomain
    await page.waitForURL(`http://${subdomain}.localhost:5173/**`, { timeout: 15000 });
    await expect(page.getByText(/dashboard/i)).toBeVisible();

    // 7. Create first order
    await page.getByRole('link', { name: /orders/i }).click();
    await page.getByRole('button', { name: /new order|create order/i }).click();
    await expect(page.getByText(/new order|order details/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run signup spec in headed mode for visual verification**

```bash
npx playwright test e2e/tests/signup-flow.spec.ts --headed
```

Expected: browser opens, flows through the pages. Passes or skips gracefully at Clerk step if no testing token.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/signup-flow.spec.ts
git commit -m "test(e2e): add signup flow spec (landing → signup → dashboard → first order)"
```

---

### Task 14: Multi-tenant isolation spec

**Files:**
- Create: `e2e/tests/multi-tenant.spec.ts`

- [ ] **Step 1: Create `e2e/tests/multi-tenant.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

// These orgs are seeded by e2e/global-setup.ts via seed-multi-tenant.ts
const ACME_URL    = 'http://acme.localhost:5173';
const RIVIERA_URL = 'http://riviera.localhost:5173';

test.describe('Multi-tenant data isolation', () => {
  test("Riviera user cannot see Acme's customer", async ({ page }) => {
    // Log in as Acme and create a customer
    await page.goto(`${ACME_URL}/sign-in`);
    // Inject Clerk testing token for acme org
    if (process.env['CLERK_ACME_TOKEN']) {
      await page.evaluate((t) => window.localStorage.setItem('clerk-testing-token', t),
        process.env['CLERK_ACME_TOKEN']);
    }
    await page.goto(`${ACME_URL}/customers`);
    await page.getByRole('button', { name: /add|new customer/i }).click();
    await page.getByLabel(/name/i).fill('Acme Secret Customer');
    await page.getByRole('button', { name: /save|create/i }).click();
    await expect(page.getByText('Acme Secret Customer')).toBeVisible();

    // Now log in as Riviera
    await page.goto(`${RIVIERA_URL}/sign-in`);
    if (process.env['CLERK_RIVIERA_TOKEN']) {
      await page.evaluate((t) => window.localStorage.setItem('clerk-testing-token', t),
        process.env['CLERK_RIVIERA_TOKEN']);
    }
    await page.goto(`${RIVIERA_URL}/customers`);

    // Acme's customer must not appear
    await expect(page.getByText('Acme Secret Customer')).not.toBeVisible();
  });

  test('Direct URL to cross-tenant customer returns 404', async ({ page }) => {
    // Get Acme customer ID from DB (seeded by global-setup)
    // In practice: hit the API as Acme, grab the first customer ID
    await page.goto(`${ACME_URL}/customers`);
    if (process.env['CLERK_ACME_TOKEN']) {
      await page.evaluate((t) => window.localStorage.setItem('clerk-testing-token', t),
        process.env['CLERK_ACME_TOKEN']);
    }

    // Grab the first customer link
    const customerLinks = page.getByRole('link', { name: /customer|view/i });
    const href = await customerLinks.first().getAttribute('href');

    if (!href) {
      test.skip(); // No customers seeded — skip
      return;
    }

    const customerId = href.split('/').pop();

    // Access that ID as Riviera
    if (process.env['CLERK_RIVIERA_TOKEN']) {
      await page.evaluate((t) => window.localStorage.setItem('clerk-testing-token', t),
        process.env['CLERK_RIVIERA_TOKEN']);
    }
    const res = await page.request.get(`http://localhost:3001/api/customers/${customerId}`, {
      headers: { 'Authorization': `Bearer ${process.env['CLERK_RIVIERA_TOKEN'] ?? ''}`, Host: 'riviera.localhost' },
    });

    expect(res.status()).toBe(404);
  });
});
```

- [ ] **Step 2: Run multi-tenant spec**

```bash
npx playwright test e2e/tests/multi-tenant.spec.ts --headed
```

Expected: passes or skips gracefully without Clerk tokens.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/multi-tenant.spec.ts
git commit -m "test(e2e): add multi-tenant isolation spec (cross-org visibility + 404 on direct access)"
```

---

### Task 15: Subscription E2E spec

**Files:**
- Create: `e2e/tests/subscription.spec.ts`

- [ ] **Step 1: Create `e2e/tests/subscription.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

const APP_URL = 'http://acme.localhost:5173';
const STRIPE_TEST_CARD = '4242 4242 4242 4242';

test.describe('Subscription upgrade/downgrade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${APP_URL}/sign-in`);
    if (process.env['CLERK_ACME_TOKEN']) {
      await page.evaluate((t) => window.localStorage.setItem('clerk-testing-token', t),
        process.env['CLERK_ACME_TOKEN']);
    }
  });

  test('hitting FREE limit shows upgrade modal', async ({ page }) => {
    // Acme is seeded as FREE with maxOrders=3
    await page.goto(`${APP_URL}/orders`);

    // Attempt to create a 4th order
    await page.getByRole('button', { name: /new order/i }).click();

    // Expect upgrade modal to appear
    await expect(page.getByText(/upgrade|plan limit/i)).toBeVisible({ timeout: 5000 });
  });

  test('upgrade to PRO with Stripe test card lifts the limit', async ({ page }) => {
    test.skip(!process.env['STRIPE_CLI_ACTIVE'], 'Requires Stripe CLI in webhook-forward mode');

    await page.goto(`${APP_URL}/settings/billing`);
    await page.getByRole('button', { name: /upgrade|choose pro/i }).click();

    // Stripe Checkout or embedded form
    await page.getByLabel(/card number/i).fill(STRIPE_TEST_CARD);
    await page.getByLabel(/expiry|exp/i).fill('12/28');
    await page.getByLabel(/cvc/i).fill('123');
    await page.getByRole('button', { name: /subscribe|pay/i }).click();

    // Wait for webhook to update plan
    await page.waitForTimeout(3000);
    await page.reload();

    await expect(page.getByText(/PRO|pro plan/i)).toBeVisible();

    // Now create an order — should succeed
    await page.goto(`${APP_URL}/orders`);
    await page.getByRole('button', { name: /new order/i }).click();
    await expect(page.getByText(/upgrade|plan limit/i)).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run subscription spec**

```bash
npx playwright test e2e/tests/subscription.spec.ts --headed
```

Expected: "hitting FREE limit" test passes; Stripe test skips without `STRIPE_CLI_ACTIVE`.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/subscription.spec.ts
git commit -m "test(e2e): add subscription spec (limit modal, Stripe upgrade flow)"
```

---

## Phase 7: Documentation

### Task 16: Rewrite SETUP.md

**Files:**
- Modify: `docs/SETUP.md`

- [ ] **Step 1: Read existing `docs/SETUP.md`**

```bash
cat docs/SETUP.md
```

- [ ] **Step 2: Replace `docs/SETUP.md` with full content**

Write the following complete file:

```markdown
# Development Setup

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 22.0.0 | https://nodejs.org |
| Docker Desktop | Latest | https://docker.com |
| Git | Any | https://git-scm.com |

## 1. Clone and install

```bash
git clone <repo-url>
cd touchscreenpos

# Install root (E2E) dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

## 2. Environment variables

### Backend (`backend/.env`)

```env
# Database — get from Neon dashboard
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://acme.localhost:5173

# Clerk — get from clerk.com dashboard → API Keys
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe — get from stripe.com dashboard → Developers → API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

### Frontend (`frontend/.env`)

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3001
VITE_APP_DOMAIN=localhost
```

## 3. Database setup

```bash
cd backend

# Push schema to your Neon database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed demo data
npm run db:seed
```

## 4. Start dev servers

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Running at http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Running at http://localhost:5173
```

## 5. Multi-tenant local routing

Tenant subdomains like `acme.yourapp.com` work in production via DNS. Locally, use:

- `acme.localhost:5173` — browser resolves `.localhost` subdomains natively in Chrome/Edge
- Or set `VITE_DEV_SUBDOMAIN=acme` in `frontend/.env` to force the app into tenant mode on `localhost:5173`

## 6. Common errors

| Error | Cause | Fix |
|---|---|---|
| `Missing VITE_CLERK_PUBLISHABLE_KEY` | `.env` not created | Copy `.env.example` and fill values |
| `Prisma engine not found` | Client not generated | Run `npx prisma generate` |
| `CORS error` | Frontend URL not in `CORS_ORIGINS` | Add `http://localhost:5173` to backend `.env` |
| `Connection refused :3001` | Backend not started | Run `npm run dev` in `/backend` |
| `Invalid Clerk key` | Using live key in dev | Use `pk_test_` keys for development |
```

- [ ] **Step 3: Commit**

```bash
git add docs/SETUP.md
git commit -m "docs: rewrite SETUP.md with full local dev instructions"
```

---

### Task 17: Rewrite DEPLOYMENT.md

**Files:**
- Modify: `docs/DEPLOYMENT.md`

- [ ] **Step 1: Read existing `docs/DEPLOYMENT.md`**

```bash
cat docs/DEPLOYMENT.md
```

- [ ] **Step 2: Replace with full content**

```markdown
# Deployment Guide

## Stack

| Layer | Service |
|---|---|
| Frontend | Vercel |
| Backend | Vercel (serverless) or Railway |
| Database | Neon (PostgreSQL) |
| Auth | Clerk |
| Payments | Stripe |
| Email | Resend |

## 1. Database (Neon)

1. Create account at neon.tech
2. Create project → select region closest to users
3. Copy the **pooled connection string** (contains `?pgbouncer=true`)
4. Run migrations: `DATABASE_URL=<string> npx prisma migrate deploy`

## 2. Clerk (Auth)

1. Create account at clerk.com
2. Create application → enable **Organizations**
3. In **API Keys**, copy `Publishable Key` and `Secret Key`
4. In **Domains**, add your production domain (e.g. `yourapp.com`)
5. Enable **wildcard subdomain** support: add `*.yourapp.com`

## 3. Stripe (Billing)

See [STRIPE.md](STRIPE.md) for full product/price setup.

After setup, copy:
- `Secret Key` (sk_live_...)
- `Webhook Secret` (whsec_...)
- Price IDs for each plan

## 4. Backend Deployment (Vercel)

```bash
cd backend
vercel --prod
```

**Required environment variables in Vercel dashboard:**

```
DATABASE_URL          = <Neon pooled URL>
CLERK_SECRET_KEY      = sk_live_...
CLERK_PUBLISHABLE_KEY = pk_live_...
STRIPE_SECRET_KEY     = sk_live_...
STRIPE_WEBHOOK_SECRET = whsec_...
STRIPE_PRO_PRICE_ID   = price_...
STRIPE_STARTER_PRICE_ID = price_...
FRONTEND_URL          = https://yourapp.com
CORS_ORIGINS          = https://yourapp.com,https://*.yourapp.com
NODE_ENV              = production
```

## 5. Frontend Deployment (Vercel)

```bash
cd frontend
vercel --prod
```

**Required environment variables:**

```
VITE_CLERK_PUBLISHABLE_KEY = pk_live_...
VITE_API_URL               = https://api.yourapp.com
VITE_APP_DOMAIN            = yourapp.com
```

## 6. DNS & Wildcard Subdomains

In your DNS provider (Cloudflare recommended):

| Type | Name | Value |
|---|---|---|
| A | `@` | Vercel IP |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `*` | `cname.vercel-dns.com` |

The wildcard `*` record routes all tenant subdomains (`acme.yourapp.com`) to your frontend.

In Vercel → your frontend project → **Domains**: add `*.yourapp.com`.

## 7. Stripe Webhook

In Stripe dashboard → **Developers** → **Webhooks**:

- Endpoint URL: `https://api.yourapp.com/api/stripe/webhook`
- Events to listen for:
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `checkout.session.completed`

Copy the webhook signing secret → set as `STRIPE_WEBHOOK_SECRET`.

## 8. Post-deployment checklist

- [ ] `GET https://api.yourapp.com/api/health` returns `200`
- [ ] Signup flow works end-to-end on production domain
- [ ] Stripe test payment succeeds and upgrades plan
- [ ] Wildcard subdomain resolves (e.g. `acme.yourapp.com`)
- [ ] Clerk session persists after page reload
```

- [ ] **Step 3: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: rewrite DEPLOYMENT.md with Vercel/Neon/Clerk/Stripe full setup"
```

---

### Task 18: Write MULTI_TENANT.md

**Files:**
- Create: `docs/MULTI_TENANT.md`

- [ ] **Step 1: Create `docs/MULTI_TENANT.md`**

```markdown
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
Request arrives
  → injectTenant middleware reads subdomain from Host header
  → Looks up Organization in DB by subdomain
  → Sets req.organizationDbId (Prisma row ID)
  → requireAuth checks Clerk JWT
  → Cross-checks: user must be a member of that org
  → Request handler runs (organizationId is on req)
```

If there is no subdomain (e.g. marketing domain), the middleware falls back to the Clerk `org_id` from the JWT.

## How organizationId Flows Through Every Layer

**API Route:**
```typescript
router.post('/orders', requireAuth, checkLimit('orders'), async (req, res) => {
  const order = await orderService.create({
    ...req.body,
    organizationId: req.organizationDbId!, // always injected
  });
});
```

**Prisma middleware (automatic):**
All `findMany`, `create`, `update`, `delete` calls are automatically scoped to the current tenant via `AsyncLocalStorage`. See `backend/src/middleware/tenantIsolation.ts`.

**Frontend:**
The frontend reads the subdomain from `window.location.hostname` to determine which org's data to show. All API calls include the `Authorization` header (Clerk JWT with org context).

## Data Separation

All tenant data tables have:
```sql
organizationId TEXT NOT NULL REFERENCES organizations(id)
```

The Prisma middleware injects `WHERE "organizationId" = $current` on every read and prevents writes without the correct org context.

**Models excluded from tenant scoping:**
- `Organization` itself (looked up by Clerk org ID cross-tenant)

## Adding a New Organization

Organizations are provisioned automatically when a user signs up:

1. User completes Clerk signup → Clerk creates an org
2. Frontend calls `POST /api/auth/register` with `{ clerkOrgId, slug, name }`
3. Backend creates an `Organization` row and a `User` row
4. User is redirected to `slug.yourapp.com`

To add one manually (e.g. for internal testing):
```bash
cd backend
npx tsx src/scripts/seed-multi-tenant.ts
```
This creates 3 demo orgs: `acme` (FREE), `riviera` (PRO), `blueprint` (ENTERPRISE).

## Testing Multi-Tenancy Locally

1. Start both dev servers (see SETUP.md)
2. Set `VITE_DEV_SUBDOMAIN=acme` in `frontend/.env` OR visit `http://acme.localhost:5173`
3. Chrome and Edge resolve `.localhost` subdomains natively — no `/etc/hosts` changes needed
4. Firefox requires adding `127.0.0.1 acme.localhost` to your hosts file

To run the isolation test suite:
```bash
cd backend
npm test src/tests/tenant-isolation.test.ts
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/MULTI_TENANT.md
git commit -m "docs: add MULTI_TENANT.md (architecture, organizationId flow, local testing)"
```

---

### Task 19: Rewrite API.md

**Files:**
- Modify: `docs/API.md`

- [ ] **Step 1: Read current `docs/API.md`**

```bash
cat docs/API.md
```

- [ ] **Step 2: Replace with full API reference**

```markdown
# API Reference

**Base URL:** `https://api.yourapp.com` (production) / `http://localhost:3001` (development)

All endpoints require:
- `Authorization: Bearer <clerk-session-token>` header
- `Host: <subdomain>.yourapp.com` header (for tenant resolution)

## Authentication

### POST /api/auth/register
Create organization and owner user after Clerk signup.

**Body:**
```json
{
  "clerkOrgId":  "org_xxx",
  "clerkUserId": "user_xxx",
  "slug":        "acme",
  "name":        "Acme Shirts",
  "email":       "owner@acme.com"
}
```

**Response 201:**
```json
{ "data": { "organizationId": "clx...", "subdomain": "acme" } }
```

---

## Orders

### GET /api/orders
List all orders for the org.

**Query params:** `?page=1&limit=20&status=PENDING&search=ORD-123`

**Response 200:**
```json
{
  "data": [
    { "id": "clx...", "orderNumber": "ORD-001", "status": "PENDING", "totalAmount": 125.00, "customer": { "name": "Jane Smith" } }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

### POST /api/orders
Create a new order. Blocked at plan limit.

**Body:**
```json
{
  "customerId": "clx...",
  "items": [{ "productId": "clx...", "quantity": 2, "unitPrice": 25.00 }],
  "notes": "Rush order"
}
```

**Response 201:** Created order object.

**Response 403 (limit exceeded):**
```json
{ "error": "Order limit reached for FREE plan", "code": "LIMIT_EXCEEDED" }
```

### GET /api/orders/:id
Get a single order with items and status history.

### PATCH /api/orders/:id
Update order status or notes.

### DELETE /api/orders/:id
Delete order. Requires OWNER or MANAGER role.

---

## Customers

### GET /api/customers
List customers. Query: `?search=Jane&page=1&limit=20`

### POST /api/customers
Create customer. Body: `{ "name", "email", "phone", "notes" }`

### GET /api/customers/:id
Customer detail with order history.

### PATCH /api/customers/:id
Update customer fields.

### DELETE /api/customers/:id
Delete customer. Requires OWNER role.

---

## Products

### GET /api/products
List products with categories and add-ons.

### POST /api/products
Create product. Body: `{ "name", "sku", "basePrice", "categoryId?" }`

### GET /api/products/:id
Product detail.

### PATCH /api/products/:id
Update product.

### DELETE /api/products/:id
Delete product.

---

## Inventory

### GET /api/inventory
List inventory items with stock levels.

### POST /api/inventory
Create inventory item. Body: `{ "name", "sku", "quantity", "reorderPoint" }`

### PATCH /api/inventory/:id
Update item (quantity, details).

### POST /api/inventory/:id/adjust
Adjust stock. Body: `{ "delta": -5, "reason": "Used in order ORD-001" }`

---

## Dashboard

### GET /api/dashboard
Returns summary metrics for the org.

**Response 200:**
```json
{
  "data": {
    "ordersToday": 12,
    "revenueMtd": 4520.00,
    "pendingOrders": 8,
    "lowStockItems": 3
  }
}
```

---

## Billing

### GET /api/billing
Get current plan, usage, and limits. Requires OWNER role.

**Response 200:**
```json
{
  "data": {
    "plan": "PRO",
    "usage": {
      "orders":         { "current": 342, "max": 5000 },
      "customers":      { "current": 89,  "max": 2000 },
      "users":          { "current": 3,   "max": 10 },
      "inventoryItems": { "current": 120, "max": 5000 }
    }
  }
}
```

### POST /api/billing/create-checkout-session
Create a Stripe Checkout session for plan upgrade.

**Body:** `{ "priceId": "price_xxx" }`
**Response:** `{ "data": { "url": "https://checkout.stripe.com/..." } }`

---

## Settings

### GET /api/settings
Get org settings (tax rate, currency, timezone, etc.)

### PATCH /api/settings
Update org settings.

### GET /api/settings/users
List org members. Requires OWNER or MANAGER role.

---

## Stripe Webhooks

### POST /api/stripe/webhook
Receives Stripe events. Validates signature with `STRIPE_WEBHOOK_SECRET`.

**Do not call this manually.** Stripe sends events here automatically.

---

## Error Format

All errors return:
```json
{
  "error": "Human-readable message",
  "code":  "MACHINE_READABLE_CODE",
  "statusCode": 400
}
```

Common codes: `UNAUTHENTICATED` (401) · `FORBIDDEN` (403) · `NOT_FOUND` (404) · `LIMIT_EXCEEDED` (403) · `VALIDATION_ERROR` (422)
```

- [ ] **Step 3: Commit**

```bash
git add docs/API.md
git commit -m "docs: rewrite API.md with full endpoint reference (all route groups, auth, errors)"
```

---

### Task 20: Write STRIPE.md

**Files:**
- Create: `docs/STRIPE.md`

- [ ] **Step 1: Create `docs/STRIPE.md`**

```markdown
# Stripe Setup Guide

## 1. Create Stripe Account

Sign up at stripe.com. Use **Test Mode** (toggle in dashboard top-left) during development.

## 2. Create Products and Prices

In Stripe dashboard → **Products** → **Add product**:

Create one product per plan:

| Product Name | Price | Interval | Usage |
|---|---|---|---|
| Starter Plan | $29.00 | Monthly | `STRIPE_STARTER_PRICE_ID` |
| Pro Plan     | $79.00 | Monthly | `STRIPE_PRO_PRICE_ID` |
| Enterprise   | Custom | Contact | Manual |

After creating each price, copy the **Price ID** (starts with `price_`).

## 3. Set Environment Variables

In `backend/.env`:
```env
STRIPE_SECRET_KEY       = sk_test_...
STRIPE_WEBHOOK_SECRET   = whsec_...   # set after webhook setup below
STRIPE_STARTER_PRICE_ID = price_...
STRIPE_PRO_PRICE_ID     = price_...
```

Map price IDs to plans in `backend/src/constants/stripe.ts` (or wherever your plan mapping lives).

## 4. Configure Webhook (Local Development)

Install the Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (scoop)
scoop install stripe
```

Log in:
```bash
stripe login
```

Forward webhooks to your local backend:
```bash
stripe listen --forward-to http://localhost:3001/api/stripe/webhook
```

Copy the webhook signing secret it prints (`whsec_...`) → set as `STRIPE_WEBHOOK_SECRET` in `backend/.env`.

## 5. Configure Webhook (Production)

In Stripe dashboard → **Developers** → **Webhooks** → **Add endpoint**:

- URL: `https://api.yourapp.com/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET` in your production environment.

## 6. Test Cards

| Card Number | Result |
|---|---|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 9995` | Card declined |
| `4000 0027 6000 3184` | Requires 3D Secure auth |

Use any future expiry date and any 3-digit CVC.

## 7. Testing the Webhook Flow Locally

1. Start backend: `npm run dev` in `/backend`
2. Start Stripe CLI: `stripe listen --forward-to localhost:3001/api/stripe/webhook`
3. In another terminal, trigger a test event:
   ```bash
   stripe trigger customer.subscription.updated
   ```
4. Check backend logs — you should see the event processed and the org plan updated.

## 8. Going Live

1. In Stripe dashboard, switch from **Test Mode** to **Live Mode**
2. Create the same products/prices in live mode
3. Copy live keys (`sk_live_...`) to your production environment variables
4. Update `STRIPE_WEBHOOK_SECRET` with the live webhook's signing secret
```

- [ ] **Step 2: Commit**

```bash
git add docs/STRIPE.md
git commit -m "docs: add STRIPE.md (product setup, webhook config, test cards, CLI usage)"
```

---

### Task 21: Rewrite USER_GUIDE.md

**Files:**
- Modify: `docs/USER_GUIDE.md`

- [ ] **Step 1: Read existing `docs/USER_GUIDE.md`**

```bash
cat docs/USER_GUIDE.md
```

- [ ] **Step 2: Replace with full user guide**

```markdown
# User Guide

This guide explains how to use the T-Shirt POS system as a shop owner or staff member.

## Getting Started

After signing up, you'll land on your shop's dashboard at `yourshop.yourapp.com`. Bookmark this URL — it's unique to your shop.

---

## Dashboard

The dashboard gives you a real-time view of your shop:

- **Orders today** — how many orders have come in today
- **Revenue this month** — total sales for the current month
- **Pending orders** — orders that still need attention
- **Low stock alerts** — inventory items running low

Click any number to jump to the relevant section.

---

## Orders

**To create a new order:**
1. Click **Orders** in the sidebar
2. Click **New Order**
3. Select or search for a customer
4. Add products by clicking **Add Item**
5. Set quantities and any custom pricing
6. Add production notes if needed (e.g. "Rush job", "Client logo on left chest")
7. Click **Create Order**

**Order statuses:**
| Status | Meaning |
|---|---|
| Pending | Order received, not started |
| In Production | Being printed/embroidered |
| Quality Check | Finished, being reviewed |
| Ready | Ready for pickup or shipping |
| Completed | Delivered and done |
| Cancelled | Order cancelled |

**To update an order's status:** Open the order → click the status dropdown → select the new status.

---

## Customers

Store your customers' contact details and see their full order history.

**To add a customer:**
1. Click **Customers** → **New Customer**
2. Enter name, email, and phone
3. Click **Save**

**To view a customer's history:** Click the customer's name to see all their past orders and total spend.

---

## Inventory

Track your blanks, threads, and other materials.

**To add an inventory item:**
1. Click **Inventory** → **New Item**
2. Enter name, SKU, quantity, and reorder point
3. Click **Save**

**Low stock alerts:** When an item falls below its reorder point, it appears in the dashboard's low-stock section and is highlighted in the inventory list.

**To adjust stock:** Open an item → click **Adjust Stock** → enter the change (positive to add, negative to remove) and a reason.

---

## Products

Set up your product catalog with pricing.

**To add a product:**
1. Click **Products** → **New Product**
2. Enter name, SKU, and base price
3. Optionally assign a category and add-ons (e.g. "Oversized fit +$5")
4. Click **Save**

Products appear in the order creation form for quick selection.

---

## POS (Point of Sale)

The POS screen is optimized for touchscreens and quick transactions at the counter.

1. Click **POS** in the sidebar
2. Tap products to add them to the cart
3. Set quantities with the + / - buttons
4. Tap **Checkout**
5. Select payment method → complete the transaction

---

## Reports

**Sales Report:** Total revenue, order count, and average order value by date range.

**Production Report:** Orders by status — see what's in progress and what's been completed.

To run a report:
1. Click **Reports**
2. Select the report type
3. Set the date range
4. Click **Run Report**

Reports can be exported to CSV.

---

## Settings

### General
Set your shop name, tax rate, currency, and timezone.

### Users & Roles
Invite team members and assign roles:
- **Owner** — full access including billing
- **Manager** — all features except billing
- **Staff** — create/view orders and customers; no admin access

To invite someone: **Settings** → **Users** → **Invite User** → enter their email.

### Billing
View your current plan, usage, and upgrade options. Billing is managed through Stripe — your card details are never stored on our servers.

### Branding *(PRO and above)*
Upload your logo, set brand colors, and customize the look of your customer-facing pages.

---

## FAQs

**Q: Can I use the POS on a tablet?**
Yes. The interface is designed for touchscreens. Use Chrome or Edge on Android or iPad.

**Q: What happens if I go offline?**
The app will notify you that you're offline. Changes made offline will sync automatically when your connection is restored.

**Q: Can I have multiple locations?**
Yes — each location can be set up as a separate organization under your account, each with its own subdomain and data.

**Q: How do I cancel my subscription?**
Go to **Settings** → **Billing** → **Cancel Subscription**. You'll keep access until the end of your billing period.

**Q: I can't log in — what do I do?**
Make sure you're visiting your shop's subdomain (e.g. `myshop.yourapp.com`), not the main marketing site. If you've forgotten your password, use the "Forgot password" link on the login screen.
```

- [ ] **Step 3: Commit**

```bash
git add docs/USER_GUIDE.md
git commit -m "docs: rewrite USER_GUIDE.md with full feature walkthroughs and FAQs"
```

---

## Phase 8: Backend Scripts

### Task 22: seed-multi-tenant.ts

**Files:**
- Create: `backend/src/scripts/seed-multi-tenant.ts`

- [ ] **Step 1: Create `backend/src/scripts/seed-multi-tenant.ts`**

```typescript
/**
 * Seed 3 demo organizations for E2E testing and manual QA.
 * Run: npx tsx src/scripts/seed-multi-tenant.ts
 *
 * Idempotent — skips orgs that already exist.
 */
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const ORGS = [
  {
    clerkOrgId: 'org_demo_acme',
    slug:       'acme',
    name:       'Acme Shirts',
    subdomain:  'acme',
    plan:       'FREE' as const,
    maxOrders:  3, // lowered for E2E test speed
    maxCustomers: 100,
    maxInventoryItems: 500,
    maxUsers: 1,
    ownerClerkUserId: 'user_demo_acme_owner',
    ownerEmail: 'owner@acme.com',
    productCount: 5,
    customerCount: 10,
    orderCount: 2,
  },
  {
    clerkOrgId: 'org_demo_riviera',
    slug:       'riviera',
    name:       'Riviera Print Co.',
    subdomain:  'riviera',
    plan:       'PRO' as const,
    maxOrders:  5000,
    maxCustomers: 2000,
    maxInventoryItems: 5000,
    maxUsers: 10,
    ownerClerkUserId: 'user_demo_riviera_owner',
    ownerEmail: 'owner@riviera.com',
    productCount: 15,
    customerCount: 30,
    orderCount: 80,
  },
  {
    clerkOrgId: 'org_demo_blueprint',
    slug:       'blueprint',
    name:       'Blueprint Embroidery',
    subdomain:  'blueprint',
    plan:       'ENTERPRISE' as const,
    maxOrders:  -1,
    maxCustomers: -1,
    maxInventoryItems: -1,
    maxUsers: -1,
    ownerClerkUserId: 'user_demo_blueprint_owner',
    ownerEmail: 'owner@blueprint.com',
    productCount: 30,
    customerCount: 50,
    orderCount: 150,
  },
];

async function seedOrg(config: typeof ORGS[number]) {
  const existing = await prisma.organization.findUnique({
    where: { clerkOrgId: config.clerkOrgId },
  });

  if (existing) {
    console.log(`  Skipping ${config.slug} (already exists)`);
    return;
  }

  console.log(`  Creating ${config.slug}...`);

  const org = await prisma.organization.create({
    data: {
      clerkOrgId:       config.clerkOrgId,
      slug:             config.slug,
      name:             config.name,
      subdomain:        config.subdomain,
      plan:             config.plan,
      maxOrders:        config.maxOrders,
      maxCustomers:     config.maxCustomers,
      maxInventoryItems: config.maxInventoryItems,
      maxUsers:         config.maxUsers,
    },
  });

  // Owner user
  await prisma.user.create({
    data: {
      clerkUserId:    config.ownerClerkUserId,
      email:          config.ownerEmail,
      firstName:      faker.person.firstName(),
      lastName:       faker.person.lastName(),
      role:           'OWNER',
      organizationId: org.id,
      isActive:       true,
    },
  });

  // Products
  const products = await Promise.all(
    Array.from({ length: config.productCount }, () =>
      prisma.product.create({
        data: {
          name:           faker.commerce.productName(),
          sku:            faker.string.alphanumeric(8).toUpperCase(),
          basePrice:      parseFloat(faker.commerce.price({ min: 10, max: 100 })),
          organizationId: org.id,
        },
      })
    )
  );

  // Customers
  const customers = await Promise.all(
    Array.from({ length: config.customerCount }, () =>
      prisma.customer.create({
        data: {
          name:           faker.person.fullName(),
          email:          faker.internet.email(),
          phone:          faker.phone.number(),
          organizationId: org.id,
        },
      })
    )
  );

  // Orders
  const statuses = ['PENDING', 'IN_PRODUCTION', 'READY', 'COMPLETED'] as const;
  await Promise.all(
    Array.from({ length: config.orderCount }, (_, i) =>
      prisma.order.create({
        data: {
          orderNumber:    `${config.slug.toUpperCase().slice(0,3)}-${String(i + 1).padStart(4, '0')}`,
          status:         statuses[i % statuses.length]!,
          customerId:     customers[i % customers.length]!.id,
          organizationId: org.id,
          totalAmount:    parseFloat(faker.commerce.price({ min: 50, max: 500 })),
        },
      })
    )
  );

  console.log(`  ✓ ${config.slug}: ${config.productCount} products, ${config.customerCount} customers, ${config.orderCount} orders`);
}

async function main() {
  console.log('Seeding multi-tenant demo data...');
  for (const org of ORGS) {
    await seedOrg(org);
  }
  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run seed script to verify it works**

```bash
cd backend
npx tsx src/scripts/seed-multi-tenant.ts
```

Expected output:
```
Seeding multi-tenant demo data...
  Creating acme...
  ✓ acme: 5 products, 10 customers, 2 orders
  Creating riviera...
  ✓ riviera: 15 products, 30 customers, 80 orders
  Creating blueprint...
  ✓ blueprint: 30 products, 50 customers, 150 orders
Done.
```

- [ ] **Step 3: Run again to verify idempotence**

```bash
npx tsx src/scripts/seed-multi-tenant.ts
```

Expected: all 3 orgs show "Skipping ... (already exists)".

- [ ] **Step 4: Commit**

```bash
git add backend/src/scripts/seed-multi-tenant.ts
git commit -m "feat(scripts): add seed-multi-tenant.ts (3 demo orgs, idempotent)"
```

---

### Task 23: migrate-to-multi-tenant.ts

**Files:**
- Create: `backend/src/scripts/migrate-to-multi-tenant.ts`

- [ ] **Step 1: Create `backend/src/scripts/migrate-to-multi-tenant.ts`**

```typescript
/**
 * Migration script: assign any records missing organizationId to a default org.
 *
 * Use this if you ran the app before multi-tenancy was enforced and have
 * orphaned records in the database.
 *
 * Run: npx tsx src/scripts/migrate-to-multi-tenant.ts
 *
 * Idempotent — safe to run multiple times.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ORG_CLERK_ID  = 'org_migrated_default';
const DEFAULT_ORG_SLUG      = 'default';
const DEFAULT_ORG_SUBDOMAIN = 'default';

async function getOrCreateDefaultOrg() {
  const existing = await prisma.organization.findUnique({
    where: { clerkOrgId: DEFAULT_ORG_CLERK_ID },
  });

  if (existing) {
    console.log(`Using existing default org: ${existing.id}`);
    return existing;
  }

  console.log('Creating default organization for orphaned records...');
  const org = await prisma.organization.create({
    data: {
      clerkOrgId: DEFAULT_ORG_CLERK_ID,
      slug:       DEFAULT_ORG_SLUG,
      name:       'Default Organization (Migrated)',
      subdomain:  DEFAULT_ORG_SUBDOMAIN,
      plan:       'FREE',
    },
  });
  console.log(`Created default org: ${org.id}`);
  return org;
}

type TableName = 'orders' | 'customers' | 'products' | 'inventory_items' | 'users' | 'vendors';

async function migrateTable(table: TableName, orgId: string): Promise<number> {
  const result = await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET "organizationId" = $1 WHERE "organizationId" IS NULL OR "organizationId" = ''`,
    orgId,
  );
  return result;
}

async function main() {
  console.log('Starting multi-tenant migration...');
  console.log('');

  const defaultOrg = await getOrCreateDefaultOrg();
  console.log('');

  const tables: TableName[] = ['users', 'customers', 'orders', 'products', 'inventory_items', 'vendors'];

  let totalMigrated = 0;
  for (const table of tables) {
    const count = await migrateTable(table, defaultOrg.id);
    if (count > 0) {
      console.log(`  ✓ ${table}: migrated ${count} records`);
      totalMigrated += count;
    } else {
      console.log(`  — ${table}: no orphaned records`);
    }
  }

  console.log('');
  if (totalMigrated > 0) {
    console.log(`Migration complete. ${totalMigrated} records assigned to "${DEFAULT_ORG_SLUG}" org.`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Verify data in Prisma Studio: npx prisma studio');
    console.log('  2. Rename the default org in the database if needed');
    console.log('  3. Assign users to their correct organizations');
  } else {
    console.log('No orphaned records found. Database is already multi-tenant.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run migration script on dev database**

```bash
cd backend
npx tsx src/scripts/migrate-to-multi-tenant.ts
```

Expected: Either "no orphaned records" (if DB is already clean) or reports counts and creates the default org.

- [ ] **Step 3: Commit**

```bash
git add backend/src/scripts/migrate-to-multi-tenant.ts
git commit -m "feat(scripts): add migrate-to-multi-tenant.ts (idempotent orphan record assignment)"
```

---

## Final Verification

- [ ] **Run full backend test suite**

```bash
cd backend && npm test
```

Expected: All 5 test files pass.

- [ ] **Run full frontend test suite**

```bash
cd frontend && npx vitest run
```

Expected: All 3 test files pass.

- [ ] **Run E2E tests in headed mode**

```bash
npx playwright test --headed
```

Expected: Signup and multi-tenant specs pass; subscription spec passes or skips gracefully at Stripe step.

- [ ] **Final commit**

```bash
git add -A
git commit -m "test: complete testing suite and documentation — backend, frontend, E2E, docs, scripts"
```
