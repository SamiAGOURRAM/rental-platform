# AGENTS.md

## Scope and source of truth

- This is a pnpm workspace (`pnpm-workspace.yaml`) with two packages: `packages/backend` and `packages/frontend`; prefer `pnpm --filter <package> ...` commands from repo root.
- `docs/architecture.md` was reclassified to "Implemented" on 2026-04-28; use executable sources first (`package.json` scripts, `packages/backend/src/app.ts`, `packages/backend/src/server.ts`) for the latest truth.
- Keep the repo workflow expectations from `CLAUDE.md`: for non-trivial tasks, maintain plan/review notes in `tasks/todo.md` and verify changes before closing work.

## Setup and runtime prerequisites

- Required toolchain: Node `>=20` and pnpm `>=9` (root `package.json` engines).
- Backend startup hard-validates env via Zod (`packages/backend/src/config/index.ts`); missing required vars (DB/Redis/JWT/Stripe/storage) will crash boot.
- Local infra: `docker compose up -d postgres redis` (from repo root). Avoid starting `app` in compose if you are running backend locally, because both use port `3000`.
- Frontend dev server is `5173` and proxies `/api` to backend `http://localhost:3000` (`packages/frontend/vite.config.ts`).

## Exact commands

- Install deps: `pnpm install`
- Backend dev: `pnpm dev` (root shortcut) or `pnpm --filter backend dev`
- Frontend dev: `pnpm dev:frontend` (root shortcut) or `pnpm --filter frontend dev`
- Backend verification (recommended order):
  - `pnpm --filter backend lint` (TypeScript no-emit check)
  - `pnpm --filter backend build`
  - `pnpm --filter backend test`
- Frontend verification: `pnpm --filter frontend build` (includes `tsc -b`; no frontend test/lint scripts are defined)
- Run one backend test file: `pnpm --filter backend test -- src/modules/order/pricing.service.test.ts`

## Prisma and database workflow

- Prisma files are in `packages/backend/prisma/` (`schema.prisma`, `migrations/`, `seed.ts`).
- Root `pnpm db:migrate` runs `prisma migrate deploy`; for local schema development use `pnpm --filter backend db:migrate:dev`.
- Regenerate Prisma client after schema changes: `pnpm --filter backend db:generate`.
- Seed local data: `pnpm --filter backend db:seed` (creates demo users referenced in `packages/backend/prisma/seed.ts`).
- **Windows:** stop all backend watchers (`tsx watch`, `node`) before running `db:generate`; the running process holds `query_engine-windows.dll.node` open and will cause an `EPERM` error.

## Architecture map (high-signal)

- Backend entrypoint flow: `packages/backend/src/server.ts` -> `packages/backend/src/app.ts`.
- API surface: all module routes are under `/api/v1/*`; health check is `/health`; Swagger UI is `/docs`.
- Backend is organized by domain modules under `packages/backend/src/modules/` with `*.routes.ts`, `*.service.ts`, and `*.repository.ts` patterns.
- Frontend entrypoint is `packages/frontend/src/main.tsx`; route map is in `packages/frontend/src/App.tsx`; API client base path is `/api/v1` (`packages/frontend/src/api/client.ts`).

## Repo-specific gotchas

- pnpm build scripts are allowlisted in `.npmrc` (`onlyBuiltDependencies` for Prisma/esbuild). If you add deps with install scripts, update this allowlist or installs may silently skip required builds.
- CI runs lint → typecheck → test → build on every PR (see `.github/workflows/ci.yml`). The `integration` job also runs DB-backed tests against Postgres + Redis services.
- UI token source of truth is `packages/frontend/src/index.css` (aligned with `docs/design-system.md`); preserve existing token names/palette when editing frontend styles.

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "Is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes -- don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -- then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First:** Write plan to tasks/todo.md with checkable items
2. **Verify Plan:** Check in before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Add review section to tasks/todo.md
6. **Capture Lessons:** Update tasks/lessons.md after corrections

## Core Principles

- **Simplicity First:** Make every change as simple as possible. Impact minimal code.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Only touch what's necessary. No side effects with new bugs.
