# ADR 0011: Timed multiple-choice engine

- Status: Accepted
- Date: 2026-09-13

## Context

Likert + CTT covers self-report. Cognition needs a different item engine: discrete options, a clock, and credit only for a correct choice inside the limit. That must not go through Agree/Disagree, and it is not IRT or a validated IQ battery.

## Decision

- Register `mcq-timed-v1` next to `likert-v1`. Catalog files, seed, and HTTP share the same instrument/version/assessment tables.
- Each item has choices, a hidden `correctChoiceId`, and `timeLimitMs`. The client never receives the key.
- An answer is `{ choiceId, elapsedMs, timedOut }`. The API treats an over-limit `elapsedMs` as a timeout even if the client disagrees. Timeout scores 0 and still counts as answered.
- Scoring is `sum-correct-v1` in `packages/scoring-core`: one point per in-time correct choice, plus the same development band/percentile JSON shape as Likert.
- Seed a short original puzzle scale (`quick-pattern-reasoning`). Copy must say it is not an IQ test and not a clinical instrument.
- The run route selects a renderer from `kind`. Likert keep its runner.

## Consequences

A third engine later follows the same registry + file + runner split. Adaptive testing, item banks with exposure control, and licensed batteries stay out.

## Alternatives considered

- One runner with a `type` switch in the Likert UI: mixes timing into a scale that must not be timed.
- Client-only timer: trivial to freeze the clock.
- Reusing `ctt-v1` for 0/1 items: the reverse-key story would be a lie.
