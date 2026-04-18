import { test, expect } from '@playwright/test';

test.describe('Signup flow', () => {
  test('landing page loads and shows CTA', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.getByText('The POS built for')).toBeVisible();
    await expect(page.getByRole('button', { name: /start free/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('clicking Start Free navigates to /signup', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.getByRole('button', { name: /start free/i }).first().click();
    await page.waitForURL('**/signup');
    await expect(page.getByText(/organization name/i)).toBeVisible();
  });

  test('signup form step 1 — validates required fields', async ({ page }) => {
    await page.goto('http://localhost:5173/signup');
    // Click Continue without filling anything
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText(/organization name is required/i)).toBeVisible();
  });

  test('signup form step 1 — advances with valid data', async ({ page }) => {
    await page.goto('http://localhost:5173/signup');

    await page.getByPlaceholder(/acme t-shirts/i).fill('E2E Test Shop');
    await page.locator('select').selectOption('T-Shirts');
    await page.getByRole('button', { name: /continue/i }).click();

    // Should advance to step 2 (personal details)
    await expect(page.getByText('First Name')).toBeVisible({ timeout: 5000 });
  });

  test('Sign In button navigates to /sign-in', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/sign-in**');
  });
});
