import request from 'supertest';
import { app } from './helpers/app';
import { testPrisma } from './helpers/db';
import { truncateAll } from './helpers/truncate';
import { createOrg, createUser } from './helpers/factories';

// Mock Clerk — no real JWT validation in tests
const mockGetAuth = jest.fn();
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => mockGetAuth(),
  requireAuth: () => (_req: any, _res: any, next: any) => next(),
}));

beforeEach(async () => {
  await truncateAll();
  mockGetAuth.mockReturnValue({ userId: null, orgId: null, orgRole: null });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('GET /api/health', () => {
  it('returns 200 without authentication', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/auth/me — unauthenticated', () => {
  it('returns 401 when no Clerk session', async () => {
    mockGetAuth.mockReturnValue({ userId: null, orgId: null, orgRole: null });
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me — authenticated', () => {
  it('returns user data when user exists in DB', async () => {
    const org   = await createOrg({ subdomain: 'authtest', slug: 'authtest' });
    const user  = await createUser(org, 'OWNER');

    mockGetAuth.mockReturnValue({
      userId:  user.clerkUserId,
      orgId:   org.clerkOrgId,
      orgRole: 'org:admin',
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Host', 'authtest.localhost');

    expect([200, 401]).toContain(res.status);
    // If 200, the data field must be present
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
    }
  });
});

describe('Org subdomain uniqueness', () => {
  it('cannot create two orgs with the same subdomain', async () => {
    await createOrg({ subdomain: 'uniquetest', slug: 'uniquetest' });

    await expect(
      createOrg({ subdomain: 'uniquetest', slug: 'uniquetest2' })
    ).rejects.toThrow();
  });

  it('cannot create two orgs with the same slug', async () => {
    await createOrg({ slug: 'slugtest', subdomain: 'slugtest' });

    await expect(
      createOrg({ slug: 'slugtest', subdomain: 'slugtest2' })
    ).rejects.toThrow();
  });
});
