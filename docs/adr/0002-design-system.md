# ADR 0002: Design system and workspace chrome

- Status: Accepted
- Date: 2026-09-12

## Context

MindMetric needs one visual language on desktop and phone, but not the same layout. Tests, results, and later mini-games should plug into shared primitives instead of each inventing buttons, empty states, and navigation.

## Decision

- Tokens live as CSS variables, consumed through Tailwind v4 in `apps/web`.
- Reusable primitives live in `packages/ui` (button, empty/error/loading states). Product chrome (sidebar, bottom nav) stays in `apps/web`.
- Breakpoint `md` (768px) is the layout split: sidebar above, bottom navigation below.
- Dark-theme tokens exist on `.dark` but are not applied. No theme toggle in this phase.
- Workspace routes (`/home`, `/tests`, `/results`, `/account`) ship as honest placeholders. Auth and instruments are later phases.
- Test-taking chrome is not this shell; a runner will use a full-screen layout later.

## Consequences

Instrument UIs can import `@mindmetric/ui` without depending on the workspace nav. Changing a token updates marketing and app pages together.

## Alternatives considered

- Component library (MUI, Chakra): faster widgets, harder to give phone and desktop different structure.
- CSS Modules only: fine at this size, weaker sharing once several test renderers exist.
- Applying `prefers-color-scheme` immediately: tokens would switch before the dark theme is designed.
