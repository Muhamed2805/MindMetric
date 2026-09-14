# MindMetric

**In development.** Personal project, not a launched product.

A web platform for a calibration cognitive battery, a five-factor personality profile, and short work scales. Scoring is keyed on the server. Brain Games are practice drills; they never feed an IQ.

## Status

- Calibration phase: raw domain totals and quality notes only.
- No IQ, percentile, or confidence interval on the public UI. Those fields stay empty until a reference sample exists.
- The core five-domain battery is still a draft practice form. Domain pilots on Battery are rehearsal, not a substitute.
- No hosted demo yet. Run it locally with the steps below.

This is not a clinical measure, not a diagnosis, and not a published psychometric instrument.

Item keys live in `packages/catalog`. Treat this repository as a calibration and portfolio codebase, not a secure high-stakes form.

## Stack

pnpm monorepo: Next.js App Router, NestJS (Fastify), PostgreSQL 16, Drizzle, Better Auth. Scoring is a pure library (`packages/scoring-core`). Architecture decisions are in `docs/adr`.

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

`db:migrate` seeds the catalog from `packages/catalog`. Edit a published version by adding a new `version` object; migrate will refuse to overwrite existing published JSON.

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

## License

MIT. See [LICENSE](LICENSE).
