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

const HOST = 'permtest.localhost';

function asOwner() {
  mockGetAuth.mockReturnValue({ userId: owner.clerkUserId, orgId: org.clerkOrgId, orgRole: 'org:admin' });
}
function asManager() {
  mockGetAuth.mockReturnValue({ userId: manager.clerkUserId, orgId: org.clerkOrgId, orgRole: 'org:manager' });
}
function asStaff() {
  mockGetAuth.mockReturnValue({ userId: staff.clerkUserId, orgId: org.clerkOrgId, orgRole: 'org:member' });
}

describe('OWNER has full access', () => {
  beforeEach(asOwner);

  it('can view billing (billing:view)', async () => {
    const res = await request(app).get('/api/billing/usage').set('Host', HOST);
    expect([200, 204]).toContain(res.status);
  });

  it('can list orders (orders:view)', async () => {
    const res = await request(app).get('/api/orders').set('Host', HOST);
    expect([200, 204]).toContain(res.status);
  });
});

describe('MANAGER cannot access billing', () => {
  beforeEach(asManager);

  it('GET /api/billing/usage returns 403', async () => {
    const res = await request(app).get('/api/billing/usage').set('Host', HOST);
    expect(res.status).toBe(403);
  });

  it('can view orders (orders:view allowed for MANAGER)', async () => {
    const res = await request(app).get('/api/orders').set('Host', HOST);
    expect([200, 204]).toContain(res.status);
  });
});

describe('STAFF has limited access', () => {
  beforeEach(asStaff);

  it('can view orders (orders:view)', async () => {
    const res = await request(app).get('/api/orders').set('Host', HOST);
    expect([200, 204]).toContain(res.status);
  });

  it('cannot delete an order (orders:delete — OWNER/ADMIN only)', async () => {
    // Create order as owner first
    asOwner();
    const customer = await createCustomer(org);
    const order    = await createOrder(org, customer);

    // Switch to staff and try to delete
    asStaff();
    const res = await request(app)
      .delete(`/api/orders/${order.id}`)
      .set('Host', HOST);

    expect(res.status).toBe(403);
  });

  it('cannot access billing (billing:view — OWNER only)', async () => {
    const res = await request(app).get('/api/billing/usage').set('Host', HOST);
    expect(res.status).toBe(403);
  });

  it('cannot invite users (users:invite — OWNER/ADMIN only)', async () => {
    const res = await request(app)
      .post('/api/organization/team/invite')
      .set('Host', HOST)
      .send({ email: 'newuser@test.com', role: 'STAFF' });

    expect(res.status).toBe(403);
  });
});
