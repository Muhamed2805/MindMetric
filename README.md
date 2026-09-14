# MindMetric
IN DEVELOPMENT
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
- Catalog (public): http://localhost:3000/api/v1/instruments

`db:migrate` seeds published instruments from `packages/catalog/instruments`. Edit a published version by adding a new `version` object; migrate will refuse to overwrite existing published JSON. Likert scales and the timed puzzle set (`quick-pattern-reasoning`) ship together.

PGlite (`pglite:` URLs) is an emergency fallback only. Next and Nest cannot share one PGlite file.

## Production (Docker)

One Compose file runs Postgres, migrations, API, and web. The browser only hits port 3000.

```sh
cp .env.production.example .env.production
```

Set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and an alphanumeric `POSTGRES_PASSWORD`. Stop `pnpm dev` so port 3000 is free.

```sh
corepack pnpm prod:up
```

- App: http://localhost:3000
- Stop: `corepack pnpm prod:down`

On a public host, set `WEB_ORIGIN` and `BETTER_AUTH_URL` to the HTTPS origin. Auth cookies become `Secure` only when that URL is `https://`. Put Compose (or the two Dockerfiles) on a VM, Fly, or Railway; the CI job builds the images on every push to `main`.

Do not commit `.env.production`.

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
| `corepack pnpm prod:up` | Build and start production Compose (needs `.env.production`) |
| `corepack pnpm prod:down` | Stop production Compose |

Architecture decisions live in `docs/adr`.
