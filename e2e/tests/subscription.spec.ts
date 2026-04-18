import { test, expect } from '@playwright/test';

/**
 * Subscription upgrade/downgrade E2E tests.
 *
 * Prerequisites:
 *   - CLERK_ACME_TOKEN — Clerk testing token for the acme org (FREE plan)
 *   - STRIPE_CLI_ACTIVE=true — Stripe CLI running in webhook-forward mode
 *
 * The acme demo org is seeded with maxOrders=3 (lowered from 100 for test speed).
 */

const APP_URL = 'http://acme.localhost:5173';

test.describe('Subscription limits', () => {
  test('hitting FREE plan order limit shows upgrade prompt', async ({ page, request }) => {
    test.skip(
      !process.env['CLERK_ACME_TOKEN'],
      'Requires CLERK_ACME_TOKEN'
    );

    // Seed 3 orders via API to hit the limit (maxOrders=3 in test seed)
    for (let i = 0; i < 3; i++) {
      // This assumes at least one customer is seeded by seed-multi-tenant.ts
      await request.post('http://localhost:3001/api/orders', {
        headers: {
          'Authorization': `Bearer ${process.env['CLERK_ACME_TOKEN']}`,
          'Host':          'acme.localhost',
          'Content-Type':  'application/json',
        },
        data: {
          customerId:  'seeded-customer-id', // replaced by actual seed customer in real run
          subtotal:    50,
          taxAmount:   0,
          discount:    0,
          total:       50,
          dueDate:     new Date(Date.now() + 86400000).toISOString(),
          items:       [],
        },
      });
    }

    // Navigate to orders page and try to create another
    await page.goto(`${APP_URL}/orders`);
    await page.getByRole('button', { name: /new order/i }).click();

    // Upgrade modal or limit message should appear
    await expect(
      page.getByText(/upgrade|plan limit|limit reached/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('Stripe upgrade flow — skips without CLI active', async ({ page }) => {
    test.skip(
      !process.env['STRIPE_CLI_ACTIVE'],
      'Requires Stripe CLI running: stripe listen --forward-to localhost:3001/api/stripe/webhook'
    );

    await page.goto(`${APP_URL}/settings/billing`);
    await page.getByRole('button', { name: /upgrade|choose pro/i }).click();

    // Fill Stripe test card
    await page.getByLabel(/card number/i).fill('4242 4242 4242 4242');
    await page.getByLabel(/expiry|exp/i).fill('12/28');
    await page.getByLabel(/cvc/i).fill('123');
    await page.getByRole('button', { name: /subscribe|pay/i }).click();

    // Wait for webhook to process
    await page.waitForTimeout(4000);
    await page.reload();

    await expect(page.getByText(/PRO|pro plan/i)).toBeVisible({ timeout: 10000 });
  });
});
