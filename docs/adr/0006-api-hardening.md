# ADR 0006: API hardening without Redis

- Status: Accepted
- Date: 2026-09-12

## Context

The Nest API is now on the hot path for catalog, answers, and scoring. Better Auth already rate-limits its own routes. Redis is still deferred (ADR 0001). Unhandled errors currently leak as Fastify 500s. Health checks must stay cheap.

## Decision

- In-process sliding-window rate limits on Nest, keyed by session user id or client IP. Health is exempt. Redis-backed limits wait until a shared store exists.
- One global exception filter: HTTP exceptions keep their status and public message; everything else is `500` with a generic message. Stacks stay in logs.
- Every response gets `x-request-id`. Request logs include method, route, status, duration, and that id — not answers or emails.
- Fastify trusts the first proxy hop, limits JSON bodies to 32 KiB, and only CORS-allows `WEB_ORIGIN`.
- The workspace error UI does not render raw exception text.

## Consequences

A single API process cannot share counters across replicas. That is acceptable until Redis. Clients must handle `429`.

## Alternatives considered

- `@nestjs/throttler` plus Redis now: extra moving parts before we run more than one API instance.
- Fastify's default error page: inconsistent with `/v1` JSON clients.
