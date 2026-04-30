import { test, expect } from './fixtures.js';

test('network failure on catalog shows console warning', async ({ page }) => {
  await page.goto('/collection');

  // Collect console warnings
  const warnings: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });

  // Abort all catalog product API calls to simulate network failure
  await page.route('**/api/v1/catalog/products*', (route) => route.abort('internetdisconnected'));

  // Reload to trigger the fetch — the hook swallows the error via console.warn
  await page.reload();

  // The page should still render (empty state), no crash.
  // The Wave 1 error surfacing rule says passive fetches use console.warn, not toasts.
  // Assert at least one warning about the catalog fetch was logged.
  await page.waitForTimeout(3000);
  expect(warnings.some((w) => w.includes('useCollectionProducts'))).toBe(true);
});
