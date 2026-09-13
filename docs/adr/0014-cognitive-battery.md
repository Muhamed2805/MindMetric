# ADR 0014: Cognitive battery V1

- Status: Accepted
- Date: 2026-09-13

## Context

`mcq-timed-v1` (ADR 0011) proves one short cognitive scale. The product now needs a 40–50 minute core battery that can eventually carry a normed report. The existing session model assumes one instrument version per `assessment`; a battery spans several. Packing five subtests into a single `definition` would force a battery-wide version bump — and invalidate norms for four untouched subtests — every time one subtest changes.

## Decision

- V1 measures five domains: fluid reasoning (`gf`), processing speed (`gs`), quantitative reasoning (`rq`), spatial visualization (`gv`), working memory (`gwm`). No verbal/Gc. Gc arrives later as its own normed module.
- The item bank language is English. UI locale is independent; a translated item is not an equivalent form.
- A battery version is a **composition**. It pins exact subtest form versions, section order, and timings. Each subtest keeps its own instrument, version, engine, and scoring model.
- Fixed order: Gf → Gs → RQ → Gv → optional break → WM. Order is part of the instrument; changing it needs a new battery version and re-calibration.
- Section budget: Gf 18 items / 11 min, Gs 2 trials / 90 s each, RQ 14 items / 9 min, Gv 13 items / 7.5 min, WM 2 procedures / ~8 min. Target is 50 minutes wall clock or less.
- The section clock is an absolute server `deadline_at`, never remaining milliseconds. Power sections add a soft per-item ceiling that auto-advances. Gs trials are strictly timed. WM stimulus presentation is fixed.
- Navigation is forward-only. An answer may change until submit, then the item is locked. No previous, no end-of-section review. Resume returns the in-flight item only, keeping its original `shown_at`.
- Instructions tell examinees to guess rather than skip (ADR 0016).
- Battery administration gets its own tables (`battery_session`, `section_instance`, `item_instance`, `response`, quality events, scoring snapshots). `assessment` and `assessment_answer` stay with `likert-v1` and `mcq-timed-v1`.
- Session covariates are snapshotted on the session: age in years, device class, input mode, viewport, locale, attempt number, practice flag, administration context. Scoring and norms never read the mutable profile.
- Gv requires a hard viewport minimum for a norm-eligible attempt; below it the section runs as practice only. Gs norms are device-class aware with desktop as the reference platform. Both thresholds live in versioned rules (ADR 0017), not in code.
- Fullscreen is recommended, never enforced.
- `quick-pattern-reasoning`, the Likert instruments, and Brain Games never contribute to battery scores.

## Consequences

Changing one subtest bumps that subtest and the battery composition, not the other four subtests' norms. Adding Gc later is a new subtest plus a new battery version. Section durations are bounded, so the stated 40–50 minutes survives slow examinees. Two session models coexist until the older engines are migrated or retired.

## Alternatives considered

- One `battery-v1` instrument holding every item: a single JSON, but any item edit invalidates the whole battery's norms.
- Reusing `assessment` with a parent row: less schema, but "one session = one instrument version" stops being true and every query special-cases it.
- Adaptive order or adaptive item selection: needs calibrated items (ADR 0015), so it is premature without item parameters.
- Blocking small screens outright: fewer dirty rows, loses the mobile data needed to decide whether device strata can merge.
