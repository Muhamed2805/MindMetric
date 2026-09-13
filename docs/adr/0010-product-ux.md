# ADR 0010: Product workspace UX

- Status: Accepted
- Date: 2026-09-13

## Context

Auth, catalog files, and CTT scoring work. The screens around them do not: Home is a paragraph, Tests is a list of links, Results is a dump of scores, and the marketing page does not say what you can take. Users asked to change how the product feels before more engines or deploy.

## Decision

- Keep the same tokens, type, and workspace chrome (sidebar / bottom nav). Change hierarchy, copy, and what each route is for.
- Home is a dashboard: greeting, in-progress sessions, latest result, catalog teaser.
- Tests present each published instrument as a product card (engine label, item count, time). Instrument detail explains the run before Start.
- Results separate in-progress from completed reports and keep the development-norm disclaimer on the score view.
- `GET /v1/instruments` is public so the landing page can show the live catalog. Starting a session and reading items still require a session.
- The Likert runner gains an exit back to Tests. Answers stay saved.

## Consequences

The product reads as a workspace instead of a skeleton. Visual identity can still change later without another data model. Admin authoring, IQ engines, and a full brand redesign stay out.

## Alternatives considered

- New component library or dark theme now: extra surface area before the information architecture is right.
- Public item payloads: would expose reverse keys and full stems to anonymous clients.
