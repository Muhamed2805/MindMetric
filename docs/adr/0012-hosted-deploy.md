# ADR 0012: Hosted deploy topology

- Status: Accepted
- Date: 2026-09-13

## Context

The app is a modular monolith: Next.js (Better Auth + UI) and Nest/Fastify (catalog, assessments) sharing one PostgreSQL 16. Kubernetes, a public image registry, and a specific cloud vendor are not required yet. Local `docker compose` only runs Postgres. Production needs the two Node processes, migrations, and HTTPS cookie rules.

## Decision

- Ship `deploy/Dockerfile.api` and `deploy/Dockerfile.web`. A production Compose file (`docker-compose.prod.yml`) runs Postgres, a one-shot migrate, API, and web on one host or VM.
- The browser talks only to the web origin. Next rewrites `/api/v1/*` to the API using `API_ORIGIN` (in Compose, `http://api:3001`). Auth cookies stay first-party on `BETTER_AUTH_URL`.
- `useSecureCookies` follows `BETTER_AUTH_URL` (`https://`), not `NODE_ENV`, so an HTTP smoke run on localhost still sets a session.
- CI builds both images after verify. Pushing to a registry and picking Fly/Railway/Vercel is an operator step, not a second architecture.
- PGlite stays out of production.

## Consequences

A VM with Docker is enough to host MindMetric. Splitting web onto Vercel later is still possible: point `API_ORIGIN` at the public API and keep `WEB_ORIGIN` / `BETTER_AUTH_URL` on the HTTPS site. Rate-limit counters remain in-process (ADR 0006).

## Alternatives considered

- Kubernetes from day one: operations before traffic.
- Next.js as the only process: weaker isolation for scoring and `/v1`.
- Secure cookies whenever `NODE_ENV=production`: breaks HTTP Compose smoke tests.
