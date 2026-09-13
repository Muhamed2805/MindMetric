# ADR 0015: Item bank, revisions, and item instances

- Status: Accepted
- Date: 2026-09-13

## Context

ADR 0009 put items inside an instrument version's `definition`. A battery (ADR 0014) needs a pool larger than any single form, because exposure control and retest both require alternate forms. Later IRT calibration and exposure counting need one stable identity per item. The same item embedded in two form definitions has two identities and cannot be calibrated as one.

## Decision

- Catalog files split into three layers: `items/` (content, key, distractors, intended difficulty), `forms/` (which item revisions, order, section timing), `batteries/` (composition). ADR 0009 still holds per layer: published documents are immutable, drafts may change, migrate never rewrites a published row.
- The database gains `item` and `item_revision`. A response references an item revision, not a position inside a form's JSON. Editing content creates a new revision; forms pin revisions.
- V1 content for Gf, RQ, and Gv is hand authored and reviewed before publish. No runtime generation of reasoning items.
- WM sequences are generated per session in V1. A fixed sequence set would leak on first exposure.
- `item_instance` records what was actually presented: item revision, position, presented option order, and for generated stimuli `item_family_id`, `generator_version`, `seed`, and `parameters`.
- Option order is permuted per session and the permutation is stored. A stored choice is the option id, never the displayed position.
- Item instances distinguish shown from never shown. That is what makes `omit` and `not_reached` separable in scoring (ADR 0016).
- Calibrated procedural families are a later phase. The calibration unit is then the family, and a family may not ship until pilot data shows small within-family difficulty variance. Generators serve exposure control; they never replace item calibration.
- Exposure counts are derived from item instances, not authored.

## Consequences

Adding a test is still adding files, now of three kinds. One item can appear in several forms and remain a single calibration target. Retest depends on an alternate form built from the same bank (ADR 0017). Admin authoring stays out of scope; when it arrives it writes these documents.

## Alternatives considered

- Keeping items inside form definitions: one fewer layer, duplicate item identities as soon as a second form exists.
- Generating reasoning items at runtime in V1: an unlimited pool with unknown difficulty and a real risk of two defensible answers.
- Randomizing option order without storing the permutation: cheaper writes, but straight-lining becomes undetectable and stored choices become unreadable.
