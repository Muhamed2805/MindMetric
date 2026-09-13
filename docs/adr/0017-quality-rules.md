# ADR 0017: Quality rule set and validity

- Status: Accepted
- Date: 2026-09-13

## Context

An unproctored web battery cannot prove effort. It can measure behavior and decide how much interpretation a result supports. ADR 0005's development percentile tables are safe under a demo Likert and dangerous under an IQ label, so validity needs its own versioned rules instead of constants living in scoring code.

## Decision

- Severity is not a property of a flag. Detection produces an observation with a measured value; a versioned rule set maps (flag, scope, domain) to `info`, `warning`, or `invalidating`. The same phone-device observation is advisory for Gf and norm-disqualifying for Gv.
- Thresholds live in a `quality_rule_set` with a `quality_rule_version`, never hardcoded. V1 thresholds are explicit provisional estimates and are labeled as such. S2 replaces them with distribution-based rules without rewriting history.
- Every evaluation stores the rule version, the flags raised, their resolved severity, the measured value, and the threshold in force.
- Flags do not hide results. A section is shown with its warning; only a section that cannot be scored reports that it could not be scored reliably.
- Behavioral invalidation requires two independent signals. Hard technical causes invalidate alone: corrupt session, clock mismatch, impossible timing, WM presentation timing deviation, or too few responses to score.
- A low score is never evidence of invalidity. No rule may invalidate on accuracy alone; doing so would strip the lower tail out of the norming sample.
- Flag families: response speed, response pattern (positional bias over presented positions, cycles, machine-like cadence), missingness and timeout, device and viewport, focus loss and resume, technical integrity. Interruption is advisory in power sections and disqualifying inside a Gs trial, where the clock is the measure.
- Derived states: `section_scored`, `section_valid`, `session_valid`, `norm_eligible`. `session_valid` may stay true while individual sections are not norm-eligible. A future composite requires every core domain norm-eligible.
- Eligibility is separate from quality. Attempt number, practice mode, administration context, age range, and completeness gate `norm_eligible` without raising a user-facing warning.
- Retest requires both an elapsed cooldown (30 days for the full battery) and an available alternate form with sufficiently different items. Without an alternate form the retest stays locked or the cooldown extends. The first valid attempt is the primary norming candidate; later attempts are reported to the user but kept out of the primary sample.
- Fullscreen is not enforced. Visibility, focus, and resume events are logged as evidence, not used as gates.
- User-facing copy speaks about reliability of interpretation, never about integrity. No claim of cheating resistance. At most two visible warnings per report; the rest stays internal.

## Consequences

Thresholds can be retuned by publishing a rule set and re-scoring (ADR 0016) while every earlier result stays reproducible under the rules it was judged by. Many V1 thresholds will prove wrong by an order of magnitude; the rule set exists so they can be replaced instead of defended.

## Alternatives considered

- Severity fixed on the flag: fewer moving parts, but it forces a separate flag per domain and duplicates detection.
- Single-signal behavioral invalidation: catches more cheating, discards honest 45-minute sessions.
- Blocking results on any warning: looks strict, punishes users for owning a phone.
- One norm table with a device flag: documents the bias without removing it.
- Fullscreen lock and aggressive anti-cheat: a real UX cost, trivially bypassed on an unproctored test.
