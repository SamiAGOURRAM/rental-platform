import { test as base, expect } from '@playwright/test';

export const test = base.extend({});
export { expect };

export async function loginAsCustomer(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'customer@rental.local');
  await page.fill('input[type="password"]', 'customer123!');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/collection');
}

export async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@rental.local');
  await page.fill('input[type="password"]', 'admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/collection');
}
