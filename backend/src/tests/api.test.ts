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
});

beforeEach(() => {
  mockGetAuth.mockReturnValue({
    userId:  owner.clerkUserId,
    orgId:   org.clerkOrgId,
    orgRole: 'org:admin',
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const HOST = 'apitest.localhost';

// Routes that should return 200 for an authenticated org member
const GET_ROUTES = [
  '/api/orders',
  '/api/customers',
  '/api/products',
  '/api/inventory',
  '/api/vendors',
  '/api/purchase-orders',
  '/api/shipments',
  '/api/dashboard',
];

describe('GET routes return 200 for authenticated owner', () => {
  for (const route of GET_ROUTES) {
    it(`GET ${route} → 200`, async () => {
      const res = await request(app).get(route).set('Host', HOST);
      expect([200, 204]).toContain(res.status);
    });
  }
});

describe('Public routes', () => {
  it('GET /api/health returns 200 without auth', async () => {
    mockGetAuth.mockReturnValue({ userId: null, orgId: null, orgRole: null });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});

describe('Unauthenticated requests to protected routes', () => {
  it('returns 401 when Clerk userId is null', async () => {
    mockGetAuth.mockReturnValue({ userId: null, orgId: null, orgRole: null });
    const res = await request(app).get('/api/orders').set('Host', HOST);
    expect(res.status).toBe(401);
  });
});
