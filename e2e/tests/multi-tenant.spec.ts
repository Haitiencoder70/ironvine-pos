import { test, expect } from '@playwright/test';

/**
 * Multi-tenant isolation E2E tests.
 *
 * These tests verify that data created in one org is not visible in another.
 * They rely on:
 *   - The seeded demo orgs (acme, riviera) from global-setup.ts
 *   - CLERK_ACME_TOKEN and CLERK_RIVIERA_TOKEN env vars (Clerk testing tokens)
 *
 * Without Clerk testing tokens the tests skip gracefully at the auth step.
 */

const ACME_URL    = 'http://acme.localhost:5173';
const RIVIERA_URL = 'http://riviera.localhost:5173';

test.describe('Multi-tenant data isolation', () => {
  test('Acme subdomain loads the app (not marketing page)', async ({ page }) => {
    test.skip(
      !process.env['CLERK_ACME_TOKEN'],
      'Requires CLERK_ACME_TOKEN — set via Clerk testing tokens'
    );

    await page.goto(ACME_URL);
    // On a subdomain the app router shows sign-in or dashboard, not the marketing landing
    await expect(page.getByText('The POS built for')).not.toBeVisible({ timeout: 5000 });
  });

  test("Riviera cannot see Acme customer via direct API call", async ({ request }) => {
    test.skip(
      !process.env['CLERK_ACME_TOKEN'] || !process.env['CLERK_RIVIERA_TOKEN'],
      'Requires both CLERK_ACME_TOKEN and CLERK_RIVIERA_TOKEN'
    );

    // Create a customer as Acme
    const createRes = await request.post('http://localhost:3001/api/customers', {
      headers: {
        'Authorization': `Bearer ${process.env['CLERK_ACME_TOKEN']}`,
        'Host':          'acme.localhost',
        'Content-Type':  'application/json',
      },
      data: { firstName: 'Acme', lastName: 'SecretCustomer', email: 'secret@acme.com' },
    });
    expect(createRes.status()).toBe(201);
    const { data: created } = await createRes.json();

    // Try to access that customer as Riviera — should get 404
    const crossRes = await request.get(`http://localhost:3001/api/customers/${created.id}`, {
      headers: {
        'Authorization': `Bearer ${process.env['CLERK_RIVIERA_TOKEN']}`,
        'Host':          'riviera.localhost',
      },
    });
    expect(crossRes.status()).toBe(404);
  });

  test('customer list for Riviera does not contain Acme customers', async ({ request }) => {
    test.skip(
      !process.env['CLERK_ACME_TOKEN'] || !process.env['CLERK_RIVIERA_TOKEN'],
      'Requires both CLERK_ACME_TOKEN and CLERK_RIVIERA_TOKEN'
    );

    // Create distinctive customer as Acme
    const createRes = await request.post('http://localhost:3001/api/customers', {
      headers: {
        'Authorization': `Bearer ${process.env['CLERK_ACME_TOKEN']}`,
        'Host':          'acme.localhost',
        'Content-Type':  'application/json',
      },
      data: { firstName: 'IsolationTest', lastName: 'AcmeOnly', email: 'isolation@acme.com' },
    });
    expect(createRes.status()).toBe(201);

    // List customers as Riviera
    const listRes = await request.get('http://localhost:3001/api/customers', {
      headers: {
        'Authorization': `Bearer ${process.env['CLERK_RIVIERA_TOKEN']}`,
        'Host':          'riviera.localhost',
      },
    });
    expect(listRes.status()).toBe(200);
    const { data } = await listRes.json();
    const names = (data ?? []).map((c: any) => `${c.firstName} ${c.lastName}`);
    expect(names).not.toContain('IsolationTest AcmeOnly');
  });
});
