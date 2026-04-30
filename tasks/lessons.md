# Lessons Learned

> Patterns and corrections captured during development. Do not repeat mistakes documented here.

- No-op stubs are debt; either implement or delete immediately.
- Refresh tokens must rotate on every use; single-use is the only secure default.
- Silent `.catch(() => {})` in the frontend silently destroys user trust.
- CapsuleWardrobe schema must not be removed without product sign-off; keep until wired.
- On Windows, `prisma generate` can fail with EPERM on `query_engine-windows.dll.node`. Do not kill all node processes blindly; identify the specific PID holding the file lock.
- Killing all `node.exe` processes with `taskkill /F /IM node.exe` crashes the CLI agent and produces infinite output. Always target specific PIDs or ports.
- 401 interceptors must explicitly exclude auth routes (`/login`, `/refresh`) to prevent redundant refresh attempts and cascading network logs on expected auth failures.
- In Fastify, `setErrorHandler` must be called BEFORE registering routes inside nested plugin contexts. If the error handler is registered after, it won't apply to child context routes (the default Fastify error response is used instead).
- `@fastify/rate-limit` throws the return value of `errorResponseBuilder` as a plain object (not an Error instance). Custom error handlers must check for `(error as any).error?.code === 'RATE_LIMITED'` or `error.message?.includes('Too many requests')`.
- Prisma `$transaction` rolls back on thrown errors. Any database side effects (e.g., revoking all tokens on reuse detection) must happen OUTSIDE the transaction if they need to persist when the error is thrown.
- `@fastify/rate-limit` per-route limits require the plugin registration to be awaited before routes are defined; the plugin's `onRoute` hook only processes routes registered after the plugin is fully initialized.
- ESLint flat config: test files with `parserOptions.project` pointing to `tsconfig.json` that excludes them will fail with "file was not found in any of the provided project(s)". Use a separate config block for source code with project, and override test files with `no-explicit-any: off` etc.
- Prettier + ESLint first-pass: expect surface-level churn (semicolons, quotes, trailing commas). Run `pnpm format` then `pnpm lint --fix`; resolve remaining errors manually. Pre-existing patterns (`react-hooks/set-state-in-effect`, refs during render) should be disabled initially, not fixed.
- Playwright `webServer` array requires each server to have a distinct health-check URL (`url` field). The backend must expose a lightweight `/health` endpoint for this. `reuseExistingServer: !process.env.CI` prevents redundant server startup during local development.
- E2e specs that depend on external redirects (e.g., Stripe Checkout) cannot fully automate the return journey. Test up to the redirect boundary and cover the webhook/callback path with backend integration tests instead.
- `upload.service.test.ts` writes to disk via `node:fs/promises`. Use `os.tmpdir()` + `process.chdir()` in `beforeEach`, and `rm -rf` cleanup in `afterEach`. Never write to `process.cwd()` in tests without isolation.
- Admin route integration tests require real DB because admin routes call `prisma` directly (no service layer). When writing tests for routes without a service abstraction, use `app.inject()` integration tests, not unit mocks.
- `vi.mock` module factories must export the SAME named exports as the real module. If the real module exports `emailChannel` (singleton instance), the mock factory must export `{ emailChannel: { sendEmail: vi.fn() } }`, not a default export.
- Integration test `beforeEach` that calls `buildApp()` is expensive (~400ms per test). Group related assertions into fewer test cases when possible, or use a shared app instance across tests in the same describe block (with caution about state leakage).
- `Promise.allSettled` fan-out for side effects (persist + email): always destructure and check ALL results, not just the primary one. Secondary task failures should be logged even if they don't block the flow.
- Fastify query params with `type: 'boolean'` in the JSON schema may be coerced to boolean by some schema compilers, but without a compiler they remain strings. Normalize with `value === true || value === 'true'` to handle both forms safely.
- Frontend hooks that expose mutation functions (`readNotification`, `readAll`) must catch API errors internally and surface them via `toast.error()`. Throwing uncaught errors from user-initiated actions breaks UI control flow (e.g., navigation after click never happens).
- Ownership enforcement for single-row updates: use Prisma's composite `where: { id, userId }` instead of a separate SELECT + UPDATE. `P2025` (record not found) maps to ownership failure or missing row in one atomic operation.
- When adding a frontend dependency (e.g., `lucide-react`), verify the package builds correctly and the import paths resolve in both dev and production (`tsc -b`).
- E2e tests that login via UI and then make API calls must pass the access token explicitly in the `Authorization` header. `page.request` shares cookies but the auth middleware expects `Bearer <token>`. Expose the token on `window.__mv_accessToken` from the API client for e2e extraction.
- Rate-limit e2e tests contaminate subsequent tests when they share the same IP (localhost). Isolate rate-limit tests in a file that sorts last alphabetically (e.g., `zz-rate-limit.spec.ts`), and use unique emails so the rate-limit bucket is IP-scoped rather than account-scoped.
- E2e spec selectors (`[data-sonner-toast]`, `h1:has-text("Checkout")`, `input[placeholder="..."]`) rot silently when specs are created but never executed. Always run e2e specs against a live dev server before declaring them "created".

### 2026-04-29: Cursor encoding must round-trip

- **Symptom**: Notification "Load more" returns empty / Prisma error on second page even though the integration test asserted `nextCursor` was defined.
- **Root cause**: `buildPaginatedResult` returns `nextCursor = encodeCursor(lastItem.id)` (base64url). The notification route forwarded the encoded value straight into `prisma.findMany({ cursor: { id } })` without calling `decodeCursor`. The integration test only checked `expect(nextCursor).toBeDefined()` — it never fed the cursor back into a second request.
- **Rule**: Every route that exposes a cursor produced by `buildPaginatedResult` MUST call `decodeCursor(cursor)` before passing it to Prisma. Mirror the pattern in `order.repository.ts:36`. Integration tests for paginated endpoints MUST issue a second request using the returned `nextCursor` and assert non-empty results — defining-and-throwing-away the cursor is not a real test.

### 2026-04-29: Notification deep-links must match a real frontend route

- **Symptom**: E2e test "passed" because it only asserted `toHaveURL(/\/account\/orders\//)`; clicking a real notification lands on a blank page in production.
- **Root cause**: Backend service set `link: '/account/orders/${id}'` while `App.tsx` only declares `/orders/:id`. URL assertion in Playwright does not verify the route renders.
- **Rule**: When emitting deep-links from backend, the link MUST be cross-checked against the frontend route table at the time of feature implementation. E2e assertions for navigation MUST also assert that a known element on the destination page is visible (e.g. `expect(page.locator('h1:has-text("Order")')).toBeVisible()`), not URL alone.

### 2026-04-29: Verify package version specifier resolves to the intended major

- **Symptom**: `lucide-react` pinned at `^1.14.0` resolved to a 2019 release missing most modern icons; build passed only because `Bell` happened to exist in 1.x.
- **Root cause**: Author wrote `^1.14.0` from memory; lucide-react never went to 2.x and current major is `0.x`. No version verification was done after install.
- **Rule**: After `pnpm add <pkg>`, run `pnpm list <pkg>` (or check the lockfile) to confirm the resolved version is current. Never copy a major version from memory — copy it from the package's npm page or `pnpm view <pkg> version`.

### 2026-04-29: Cursor resolution must support non-UUID IDs (CUID2)

- **Symptom**: Cursor pagination returned the first page again (cursor silently resolved to `undefined`).
- **Root cause**: `resolveCursorId` copied from `order.repository.ts` checks `isUuid(decoded)` before accepting a decoded cursor. `Notification` uses `@default(cuid())` which produces CUID2 strings (e.g., `cmok0245m0005kivbvr56hdem`), not UUIDs. `isUuid` returned false for both the raw CUID2 and the decoded value, so `resolveCursorId` returned `undefined`.
- **Rule**: Cursor resolution helpers must be ID-format-agnostic. When `buildPaginatedResult`'s `encodeCursor(id)` can receive any ID format (UUID, CUID, nanoid), the matching `decodeCursor` call must not gate on format-specific regexes. Use `decodeCursor(cursor)` unconditionally and fall back to raw `cursor` on decode failure.

### 2026-04-29: `page.request.post` Cookie header conflicts with browser cookie jar

- **Symptom**: `page.request.post` with manual `Cookie: refresh_token=...` header returned 200 but with `null` data (cookie was not received by Fastify).
- **Root cause**: Playwright's `page.request` shares the same cookie jar as the browser context. Setting a `Cookie` header manually does NOT reliably override/isolate from stored cookies — the two sources can collide, resulting in a malformed Cookie header that `@fastify/cookie` can't parse.
- **Rule**: For e2e tests that need to replay an old cookie value after the cookie jar has been updated, use `page.evaluate(() => fetch(...))` for the first request (native browser cookie handling) and `page.request.post` with a manual Cookie header for the replay. The `fetch()` from inside `page.evaluate` uses the browser's native cookie handling and doesn't have the collision problem.
