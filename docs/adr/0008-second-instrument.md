# ADR 0008: Second published Likert instrument

- Status: Accepted
- Date: 2026-09-13

## Context

The catalog, runner, and CTT pipeline already work for one published Likert (`work-attention`). The product needs more than one construct before IQ, IRT, or a hosted deploy. Duplicate HTTP or a second scoring model would split the source of truth.

## Decision

- Add a second seeded instrument: workplace emotional awareness (`work-emotion-awareness`).
- Keep `likert-v1` items and `ctt-v1` scoring. Reverse keys, bands, and development percentiles live on the version JSON like the first scale.
- `seedCatalog` upserts every published seed instrument. The Tests list stays data-driven.
- Catalog listing orders by instrument title so two scales do not shuffle when `publishedAt` is the same.

## Consequences

Users see two takeable tests after migrate. Completing either still writes `assessment_result`. IQ items, adaptive testing, and real population norms stay out.

## Alternatives considered

- Hosted deploy before a second instrument: operations before catalog depth.
- A different engine (forced choice, IQ): new runner UI in the same phase.
- Copying a copyrighted inventory: legal risk; seed items stay original.
