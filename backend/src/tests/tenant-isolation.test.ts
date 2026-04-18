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

let acme: Awaited<ReturnType<typeof createOrg>>;
let riviera: Awaited<ReturnType<typeof createOrg>>;
let acmeOwner: Awaited<ReturnType<typeof createUser>>;
let rivieraOwner: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  await truncateAll();
  acme         = await createOrg({ subdomain: 'acme',    slug: 'acme' });
  riviera      = await createOrg({ subdomain: 'riviera', slug: 'riviera' });
  acmeOwner    = await createUser(acme,    'OWNER');
  rivieraOwner = await createUser(riviera, 'OWNER');
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

function asAcme() {
  mockGetAuth.mockReturnValue({
    userId:  acmeOwner.clerkUserId,
    orgId:   acme.clerkOrgId,
    orgRole: 'org:admin',
  });
}

function asRiviera() {
  mockGetAuth.mockReturnValue({
    userId:  rivieraOwner.clerkUserId,
    orgId:   riviera.clerkOrgId,
    orgRole: 'org:admin',
  });
}

describe('Customer isolation', () => {
  it("Riviera cannot see Acme's customers in list", async () => {
    const customer = await createCustomer(acme);

    asRiviera();
    const res = await request(app)
      .get('/api/customers')
      .set('Host', 'riviera.localhost');

    expect(res.status).toBe(200);
    const ids = (res.body.data ?? []).map((c: any) => c.id);
    expect(ids).not.toContain(customer.id);
  });

  it('Cross-tenant direct customer ID returns 404', async () => {
    const customer = await createCustomer(acme);

    asRiviera();
    const res = await request(app)
      .get(`/api/customers/${customer.id}`)
      .set('Host', 'riviera.localhost');

    expect(res.status).toBe(404);
  });
});

describe('Order isolation', () => {
  it("Acme cannot see Riviera's orders in list", async () => {
    const customer = await createCustomer(riviera);
    const order    = await createOrder(riviera, customer);

    asAcme();
    const res = await request(app)
      .get('/api/orders')
      .set('Host', 'acme.localhost');

    expect(res.status).toBe(200);
    const ids = (res.body.data ?? []).map((o: any) => o.id);
    expect(ids).not.toContain(order.id);
  });

  it('Cross-tenant direct order ID returns 404', async () => {
    const customer = await createCustomer(riviera);
    const order    = await createOrder(riviera, customer);

    asAcme();
    const res = await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Host', 'acme.localhost');

    expect(res.status).toBe(404);
  });
});

describe('Tenant middleware', () => {
  it('returns 403 when no org context (no subdomain, no Clerk org)', async () => {
    mockGetAuth.mockReturnValue({ userId: 'user_orphan', orgId: null, orgRole: null });

    const res = await request(app)
      .get('/api/orders')
      .set('Host', 'localhost');

    expect([401, 403]).toContain(res.status);
  });
});
