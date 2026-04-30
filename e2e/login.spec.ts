import { test, expect } from './fixtures.js';

test('successful login redirects to home', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'customer@rental.local');
  await page.fill('input[type="password"]', 'customer123!');
  await page.click('button[type="submit"]');
  // Default redirect is /collection (LoginPage.tsx:11)
  await expect(page).toHaveURL(/\/collection/);
});

test('wrong password shows error text', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'customer@rental.local');
  await page.fill('input[type="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');
  // The login page renders an inline error message, not a toast
  await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 });
});

