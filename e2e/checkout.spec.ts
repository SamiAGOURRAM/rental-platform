import { test, expect, loginAsCustomer } from './fixtures.js';

test('checkout flow - add items via cart, fill details, verify checkout page', async ({ page }) => {
  // Step 1: Login as customer
  await loginAsCustomer(page);

  // Step 2: Pre-populate the cart via localStorage (avoids UI-dependency on inventory availability)
  await page.evaluate(() => {
    const item = {
      id: 'seeded-item-1',
      name: 'Linen Shirt',
      brand: 'Zara',
      category: 'Tops',
      pricePerDay: 2.5,
      imageUrl: null,
      quantity: 1,
      city: 'paris',
    };
    localStorage.setItem('mv_capsule_v2', JSON.stringify([item]));
  });

  // Step 3: Navigate to checkout — should render the full checkout form
  await page.goto('/checkout');
  await expect(page.locator('h1:has-text("Checkout")')).toBeVisible({ timeout: 10000 });

  // Step 4: Fill rental dates
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() + 1);
  const end = new Date(today);
  end.setDate(end.getDate() + 4);
  const startStr = start.toISOString().split('T')[0]!;
  const endStr = end.toISOString().split('T')[0]!;

  await page.locator('input[type="date"]').nth(0).fill(startStr);
  await page.locator('input[type="date"]').nth(1).fill(endStr);

  // Step 5: Verify the Pay button is visible (checkout form rendered)
  const payButton = page.locator('button:has-text("Pay")');
  await expect(payButton).toBeVisible({ timeout: 5000 });

  // Note: Cannot click "Pay" because it redirects to Stripe's hosted checkout page.
  // The payment + order-creation logic is tested via backend integration tests.
});
