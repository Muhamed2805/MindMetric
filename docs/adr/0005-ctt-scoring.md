# ADR 0005: Classical scoring and stored results

- Status: Accepted
- Date: 2026-09-12

## Context

Answers are already stored against an instrument version. Completing a session still showed a placeholder. Percentiles need a reference distribution. Cronbach's alpha and live user-derived norms need a sample we do not have yet.

## Decision

- Scoring lives in `packages/scoring-core` as a pure function of the published Likert definition, reverse keys, and answers (`ctt-v1`).
- Reverse-keyed items are recoded as `min + max - response`. The reported score is the sum of keyed item scores.
- The API scores on complete and stores `assessment_result`. GET can replay and persist a missing row so older sessions still get a result.
- Bands (cut scores) and a development percentile table ship on the instrument version JSON. The UI must label those percentiles as development norms, not clinical or population norms.
- Result charts are SVG in the web app. No chart library in this phase.

## Consequences

Changing `ctt-v1` changes newly stored payloads. Replay uses the current library unless we later version the stored model more strictly. IRT and sample-estimated reliability stay out.

## Alternatives considered

- Percentile as percent of maximum possible: easy, easy to misread as a population rank.
- Score only in the browser: hides reverse keys poorly and splits the scoring source of truth.
- Cronbach's alpha now: needs a respondent sample, not a single protocol.
