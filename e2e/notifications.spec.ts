import { test, expect } from '@playwright/test';
import { loginAsCustomer } from './fixtures.js';

test('notification bell shows unread count and dropdown works', async ({ page }) => {
  // 1. Log in as customer via UI — token is exposed on window.__mv_accessToken
  await loginAsCustomer(page);

  // Extract the access token for API calls
  const token: string = await page.evaluate(() => (window as any).__mv_accessToken);
  expect(token).toBeTruthy();

  // 2. Initially no notifications — badge should not be visible
  await page.goto('/collection');
  await expect(page.locator('[aria-label="Notifications"]')).toBeVisible();
  await expect(page.locator('[aria-label="Notifications"] .rounded-full')).not.toBeVisible();

  // 3. Clear any existing notifications via API
  await page.request.post('http://localhost:3000/api/v1/notifications/read-all', {
    headers: { Authorization: `Bearer ${token}` },
  });

  // 4. Create an address (required for order creation)
  const addressRes = await page.request.post('http://localhost:3000/api/v1/users/me/addresses', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      label: 'Home',
      line1: '15 Rue de Rivoli',
      city: 'Paris',
      postalCode: '75001',
      countryCode: 'FR',
      isDefault: true,
    },
  });
  expect(addressRes.ok()).toBe(true);
  const addressJson = await addressRes.json();
  const addressId = addressJson.data.id;

  // 5. Fetch a product from the catalog
  const catalogRes = await page.request.get('http://localhost:3000/api/v1/catalog/products?limit=1');
  expect(catalogRes.ok()).toBe(true);
  const catalogJson = await catalogRes.json();
  const productId = catalogJson.data.items[0].id;

  // 6. Create an order with the real product + address
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() + 1);
  const end = new Date(today);
  end.setDate(end.getDate() + 4);
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  const orderRes = await page.request.post('http://localhost:3000/api/v1/orders', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      productIds: [productId],
      rentalStart: startStr,
      rentalEnd: endStr,
      deliveryMethod: 'personal',
      addressId,
      locale: 'en',
    },
  });
  expect(orderRes.ok()).toBe(true);
  const orderJson = await orderRes.json();
  const orderId = orderJson.data.id;

  // 7. Cancel the order — this fires ORDER_CANCELLED event → notification
  const cancelRes = await page.request.post(`http://localhost:3000/api/v1/orders/${orderId}/cancel`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(cancelRes.ok()).toBe(true);

  // 8. Navigate back to a page with navbar to see the bell badge
  await page.goto('/collection');

  // Wait for the unread badge to appear (initial fetch on mount)
  await expect(page.locator('[aria-label="Notifications"] .rounded-full')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[aria-label="Notifications"] .rounded-full')).toHaveText('1');

  // 9. Click bell — dropdown should show the cancelled notification
  await page.locator('[aria-label="Notifications"]').click();
  await expect(page.locator('text=Order Cancelled').first()).toBeVisible();

  // 10. Click the notification item — should navigate to order detail
  await page.locator('text=Order Cancelled').first().click();
  await expect(page).toHaveURL(/\/orders\//);

  // 11. Badge should now be gone (mark-as-read on click)
  await expect(page.locator('[aria-label="Notifications"] .rounded-full')).not.toBeVisible();
});
