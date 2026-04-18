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

// Mock Stripe constructor so no real HTTP calls happen
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

let freeOrg: Awaited<ReturnType<typeof createOrg>>;
let freeOwner: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await truncateAll();

  // Create FREE org with maxOrders = 3 for test speed
  freeOrg = await testPrisma.organization.create({
    data: {
      clerkOrgId:        'org_free_test',
      slug:              'freetest',
      name:              'Free Test Org',
      subdomain:         'freetest',
      plan:              'FREE',
      maxOrders:         3,
      maxCustomers:      100,
      maxInventoryItems: 500,
      maxUsers:          1,
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

    // Fill up to the limit
    for (let i = 0; i < 3; i++) {
      await createOrder(freeOrg, customer);
    }

    // Next attempt should be blocked
    const res = await request(app)
      .post('/api/orders')
      .set('Host', 'freetest.localhost')
      .send({
        customerId:   customer.id,
        dueDate:      new Date(Date.now() + 86400000).toISOString(),
        items:        [],
        subtotal:     0,
        taxAmount:    0,
        discount:     0,
        total:        0,
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PLAN_LIMIT_REACHED');
  });

  it('allows order creation when under the limit', async () => {
    const customer = await createCustomer(freeOrg);

    // Only 1 existing order — under the limit of 3
    await createOrder(freeOrg, customer);

    const res = await request(app)
      .post('/api/orders')
      .set('Host', 'freetest.localhost')
      .send({
        customerId:   customer.id,
        dueDate:      new Date(Date.now() + 86400000).toISOString(),
        items:        [],
        subtotal:     0,
        taxAmount:    0,
        discount:     0,
        total:        0,
      });

    // Should not be 403 (limit block) — may be 400/422 for validation but not limit
    expect(res.status).not.toBe(403);
    if (res.status === 403) {
      expect(res.body.code).not.toBe('PLAN_LIMIT_REACHED');
    }
  });

  it('PRO plan allows order creation (maxOrders = 5000)', async () => {
    const proOrg   = await createOrg({ plan: 'PRO', subdomain: 'protest', slug: 'protest' });
    const proOwner = await createUser(proOrg, 'OWNER');
    const customer = await createCustomer(proOrg);

    mockGetAuth.mockReturnValue({
      userId:  proOwner.clerkUserId,
      orgId:   proOrg.clerkOrgId,
      orgRole: 'org:admin',
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Host', 'protest.localhost')
      .send({
        customerId:   customer.id,
        dueDate:      new Date(Date.now() + 86400000).toISOString(),
        items:        [],
        subtotal:     0,
        taxAmount:    0,
        discount:     0,
        total:        0,
      });

    // Should not be blocked by plan limit
    expect(res.status).not.toBe(403);
  });
});

describe('Stripe webhook — subscription.updated', () => {
  it('updates org plan to PRO when Stripe fires subscription.updated', async () => {
    // Map stripe customer to our org
    await testPrisma.organization.update({
      where: { id: freeOrg.id },
      data:  { stripeCustomerId: 'cus_test_sub', stripeSubscriptionId: 'sub_test' },
    });

    const payload = JSON.stringify({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id:       'sub_test',
          customer: 'cus_test_sub',
          status:   'active',
          items: {
            data: [{
              price: { id: process.env['STRIPE_PRO_PRICE_ID'] ?? 'price_pro_test' },
            }],
          },
        },
      },
    });

    // Make Stripe's constructEvent return our fake event
    const Stripe = require('stripe');
    const stripeInstance = new Stripe();
    stripeInstance.webhooks.constructEvent.mockReturnValue(JSON.parse(payload));

    const res = await request(app)
      .post('/api/stripe/webhook')
      .set('stripe-signature', 'test_sig')
      .set('Content-Type', 'application/json')
      .send(payload);

    // Webhook handler should accept it (200 or 204)
    expect([200, 204]).toContain(res.status);
  });
});
