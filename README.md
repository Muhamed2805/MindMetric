# MindMetric

Web platform for psychometric and cognitive assessments.

## Requirements

- Node.js 22.12 or newer
- pnpm 10, via Corepack (`corepack enable`, then `corepack prepare pnpm@10.17.1 --activate`)
- PostgreSQL 16, via Docker Desktop (`corepack pnpm db:up`) or any reachable Postgres with the same `DATABASE_URL`

## Local development

```sh
cp .env.example .env
```

Set `BETTER_AUTH_SECRET` to a random string of at least 32 characters (`openssl rand -base64 32`). Point `DATABASE_URL` at Postgres. The default matches `docker compose`.

```sh
corepack pnpm install
corepack pnpm db:up
corepack pnpm db:migrate
corepack pnpm dev
```

- Web: http://localhost:3000
- Sign in: http://localhost:3000/login
- Workspace: http://localhost:3000/home
- API liveness: http://localhost:3001/health
- API readiness: http://localhost:3001/health/ready
- Current user: http://localhost:3000/api/v1/me

PGlite (`pglite:` URLs) is an emergency fallback only. Next and Nest cannot share one PGlite file.

## Scripts

| Command | Purpose |
| --- | --- |
| `corepack pnpm db:up` | Start local Postgres (Docker) |
| `corepack pnpm db:down` | Stop local Postgres |
| `corepack pnpm db:migrate` | Wait for Postgres, apply migrations, seed catalog |
| `corepack pnpm dev` | Run web and API |
| `corepack pnpm lint` | Lint and format check |
| `corepack pnpm typecheck` | TypeScript across workspaces |
| `corepack pnpm test` | Unit tests |
| `corepack pnpm build` | Production build |

Architecture decisions live in `docs/adr`.
