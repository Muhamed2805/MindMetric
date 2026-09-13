# ADR 0016: Battery scoring lifecycle and versioning

- Status: Accepted
- Date: 2026-09-13

## Context

ADR 0005 stores one `assessment_result` per session, scored by whatever the library currently does. A battery (ADR 0014) that will eventually report an IQ needs the opposite: several snapshots per session over time, each pinning every version that produced it, plus a hard rule that no number reaches a user before the data supports it.

## Decision

- Scoring is a pure function of published definitions, item instances, responses, snapshotted covariates, quality rules, and — when present — a norms version. It may not read `now()`, the mutable profile, or any nondeterministic source. Each snapshot stores an input digest.
- Pipeline gates: item scoring, section raw, quality evaluation, standardization, composite. Standardization requires a norms version. The composite additionally requires reliability, SEM, and every core domain present. V1 runs the first three stages; the last two have no input rather than a disabled flag.
- Maturity ladder: **S0** raw only, **S1** within-form distribution (internal, never displayed), **S2** pilot norms labeled as pilot, **S3** population norms with reliability, SEM, IQ, percentile, and confidence interval. Moving a rung is a recorded decision on a norms version, not a code change.
- A snapshot pins battery version, form versions, item revisions, the per-engine scoring model version, the aggregation model version, the quality rules version, and the norms version. Snapshots are append-only and unique per session and version tuple. Re-scoring writes a new row; the one-row-per-session rule of `assessment_result` does not apply to batteries.
- Scoring models are per engine: `accuracy-power-v1` (Gf, RQ, Gv), `speed-corrected-v1` (Gs), `span-partial-v1` (WM), aggregated by `battery-profile-v1`. `ctt-v1` and `sum-correct-v1` are untouched.
- Gf, RQ, Gv: raw is the number correct, unweighted, with no guessing correction, and instructions tell examinees to guess. `raw/max` uses the form total; accuracy over attempted items is reported beside it.
- WM: a fixed ladder, not an adaptive staircase. Strict serial-position partial credit; after two consecutive trials with no correct position the remaining trials score zero. Absolute span and fully correct sequences are recorded but are not the primary score. At S0 the two procedures combine as an equally weighted proportion of maximum.
- Gs: `C − E/(k−1)` per trial, so random responding expects zero. Every Gs trial must be a discrete decision with a known `k`. The signed value is stored; a negative value displays as zero. Trials report separately, and a single Gs index waits for sample-based standardization.
- Missing data: `omit` and item `timeout` score zero and count as attempted. `not_reached` scores zero but is excluded from calibration as not administered. Technically invalid responses leave both. An invalid WM trial reduces that section's maximum.
- Section snapshots are written on section submit, but no section result may be serialized while the session is in progress. The runner shows no correctness feedback.
- Norms are a versioned entity holding population definition, N, age bands, device class, reliability, SEM, and inclusion rules. They are computed only from raw scores and snapshotted covariates, never from standardized scores of an earlier norms version. Confidence intervals derive from the pinned version's SEM.
- Item calibration may use responses from incomplete sessions. Norms require a complete battery.
- Re-scoring never silently changes a number a user has already seen. The report names its norms version, and a changed score is explained. A scoring defect ships as a new model version with the old one marked defective.
- Rounding is fixed by the scoring model version. Re-scoring is an operator-run batch, never a request-path job; Redis and BullMQ stay out (ADR 0006).

## Consequences

V1 reports raw domain performance, completion quality, and duration. `composite`, `estimated_iq`, `percentile`, and the interval exist as null. Sessions taken at S0 can be re-scored at S2 and S3 without losing what was shown. Seven pinned axes per snapshot is real implementation surface and the main cost of this decision.

## Alternatives considered

- One scoring model version for the whole battery: simpler, forces a re-score of every domain when one formula changes.
- Percent of maximum as a provisional IQ-like number: instantly readable, indefensible, and the exact failure this battery exists to avoid.
- Formula scoring (`R − W/(k−1)`) on power sections: removes guessing gain, adds error variance and rewards risk tolerance.
- An adaptive WM staircase: fewer trials, but the score depends on the stopping rule and it reintroduces adaptive testing.
- Overwriting the stored result on re-score: one row per session, no audit trail.
