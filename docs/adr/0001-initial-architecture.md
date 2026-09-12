# ADR 0001: Initial architecture

- Status: Accepted
- Date: 2026-09-12

## Context

MindMetric is a psychometric and cognitive testing product. The first release is web-only. The domain will later include multiple instrument types, a scoring engine, normative data, and possibly IRT or adaptive testing. The first implementation must not force a rewrite when those arrive, and must not start as a distributed system.

## Decision

Ship a modular monolith in a pnpm workspace monorepo.

| Area | Choice |
| --- | --- |
| Web | Next.js App Router, TypeScript |
| API | NestJS with Fastify |
| Public API | REST, `/api/v1` when versioned routes exist |
| Database | PostgreSQL (not in this change) |
| Jobs / cache | Redis + BullMQ (not in this change) |
| Auth | Self-hosted sessions, httpOnly cookies (not in this change) |
| UI primitives | Shared design system in a later phase |
| Scoring | Pure library (`packages/scoring-core`), classical test theory first |

Bounded contexts: Identity, Catalog, Assessment, Scoring, Results, Analytics, Admin. Analytics and full authoring stay out of the first vertical slice.

## Consequences

- Web and API can deploy independently. Scoring stays in-process until CPU, language, or SLA needs a worker.
- Item definitions are versioned. Scoring is a pure function of instrument version, responses, and norms.
- Mobile native apps, Kubernetes, IRT, microservices, and Turborepo remote caching are explicit non-goals for the first phases.

## Alternatives considered

- Next.js Route Handlers as the only backend: fewer moving parts, weaker isolation for jobs, scoring, and API versioning.
- Python FastAPI from day one: better scientific libraries, two runtimes before they are needed.
- Multi-repo: extra contract drift for a single team.
- Hosted auth (Clerk, Auth0): faster start, weaker control over assessment PII and long-term cost.
