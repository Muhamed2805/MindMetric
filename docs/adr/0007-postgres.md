# ADR 0007: One PostgreSQL for web and API

- Status: Accepted
- Date: 2026-09-12

## Context

PGlite cannot be opened safely by Next (Better Auth) and Nest (catalog) at the same time. Split files removed the crash but broke foreign keys and session lookups. CI already runs PostgreSQL 16. Compose was in the repo; local default was still PGlite.

## Decision

- Supported local and production database is PostgreSQL 16. Default `DATABASE_URL` is `postgres://mindmetric:mindmetric@localhost:5432/mindmetric`, matching `docker compose`.
- Next and Nest share that URL. `db:migrate` waits for Postgres, applies migrations once, and seeds the catalog.
- `assessment.user_id` again references `user.id` (cascade delete). That is valid only with one database.
- `GET /health` stays a liveness probe. `GET /health/ready` checks the database.
- PGlite remains in code for emergencies. It is not the supported full-stack local setup.

## Consequences

Docker Desktop (or any reachable Postgres 16) is required for a trustworthy local run. Two API replicas still share Postgres; rate-limit counters do not (ADR 0006).

## Alternatives considered

- Keep split PGlite: no crash, no referential integrity, Nest cannot see Better Auth rows.
- Move Better Auth onto Nest: one DB process without Docker, larger auth rewrite.
