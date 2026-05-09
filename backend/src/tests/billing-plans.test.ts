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
