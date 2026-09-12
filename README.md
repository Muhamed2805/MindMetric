# MindMetric

Web platform for psychometric and cognitive assessments.

## Requirements

- Node.js 22.12 or newer
- pnpm 10, via Corepack (`corepack enable`, then `corepack prepare pnpm@10.17.1 --activate`)

## Local development

```sh
cp .env.example .env
```

Set `BETTER_AUTH_SECRET` to a random string of at least 32 characters (`openssl rand -base64 32`).

Local data uses PGlite (Postgres-compatible, no Docker). CI and production stay on PostgreSQL. Optional: `docker compose up -d` and a `postgres://` `DATABASE_URL`.

```sh
corepack pnpm install
corepack pnpm db:migrate
corepack pnpm dev
```

- Web: http://localhost:3000
- Sign in: http://localhost:3000/login
- Workspace: http://localhost:3000/home
- API health: http://localhost:3001/health
- Current user: http://localhost:3000/api/v1/me

## Scripts

| Command | Purpose |
| --- | --- |
| `corepack pnpm dev` | Run web and API |
| `corepack pnpm db:migrate` | Apply database migrations |
| `corepack pnpm lint` | Lint and format check |
| `corepack pnpm typecheck` | TypeScript across workspaces |
| `corepack pnpm test` | Unit tests |
| `corepack pnpm build` | Production build |

Architecture decisions live in `docs/adr`.
