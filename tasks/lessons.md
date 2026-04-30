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
