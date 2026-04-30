import { test, expect } from './fixtures.js';

test('rate limit after 5 failed attempts shows error', async ({ page }) => {
  // Use a unique email so this test doesn't contaminate other tests.
  const uniqueEmail = `ratelimit-${Date.now()}@example.com`;

  await page.goto('/login');
  for (let i = 0; i < 6; i++) {
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(200);
  }
  // After 6 attempts, the backend rate-limits the IP (5 req / 15 min).
  // The frontend catches the error and shows the generic error text.
  await expect(page.locator('text=Something went wrong')).toBeVisible({ timeout: 5000 });
});
