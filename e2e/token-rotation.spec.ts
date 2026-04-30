import { test, expect, loginAsCustomer } from './fixtures.js';

test('replay refresh token forces logout', async ({ page, context }) => {
  // Login via UI to get a session (avoids a separate API login that counts toward rate limit)
  await loginAsCustomer(page);

  // Extract refresh token from browser cookies
  const cookies = await context.cookies();
  const refreshCookie = cookies.find((c) => c.name === 'refresh_token');
  expect(refreshCookie).toBeDefined();
  const refreshToken = refreshCookie!.value;

  // Navigate away from /collection so we can detect redirect to /login
  await page.goto('/account');

  // First refresh should succeed.
  // Use page.evaluate to call fetch() from the page context, which automatically
  // includes cookies from the browser context without collision with manual Cookie headers.
  const refresh1 = await page.evaluate(async (token) => {
    const res = await fetch('http://localhost:3000/api/v1/auth/refresh', {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    return res.ok;
  }, refreshToken);
  expect(refresh1).toBe(true);

  // Replay the same token via page.evaluate — should fail (REFRESH_REVOKED)
  // The page's cookie jar was already updated by the first refresh Set-Cookie,
  // so we use context.request to bypass the updated cookie and replay the old one.
  const replay = await page.request.post('http://localhost:3000/api/v1/auth/refresh', {
    headers: { Cookie: `refresh_token=${refreshToken}` },
  });
  expect(replay.status()).toBe(401);
  const replayBody = await replay.json();
  expect(replayBody.error.code).toBe('REFRESH_REVOKED');

  // The 401 interceptor should eventually redirect to login
  await page.reload();
  await expect(page).toHaveURL(/login/);
});
