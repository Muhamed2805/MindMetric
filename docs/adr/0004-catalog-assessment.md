# ADR 0004: Catalog, assessments, and Likert runner

- Status: Accepted
- Date: 2026-09-12

## Context

MindMetric is not a generic CRUD app. Instruments must be versioned so scoring can be replayed. The first runnable instrument is a Likert scale. Taking a test needs a different chrome than the workspace shell.

## Decision

- Catalog tables: `instrument` and `instrument_version`. The version row owns the item definition JSON. Published versions are immutable.
- Assessment tables: `assessment` and `assessment_answer`. Answers are upserted per item. Only the owner can read or mutate a session.
- Item engine for this phase: `likert-v1`. Other engines get their own UI renderer later; they share the same session API.
- The Nest API owns catalog and assessment HTTP (`/v1/instruments`, `/v1/assessments`). The web origin proxies `/api/v1/*`.
- Assessment `user_id` is the Better Auth user id stored as text, not a foreign key. Local PGlite cannot be shared by Next (auth) and Nest (catalog). Postgres in CI/production uses one database; the cookie still proves ownership.
- The test runner is a full-screen route (`/run/:id`), not the workspace sidebar/bottom nav.
- Completing a session stores answers. Classical scoring, percentiles, and result charts are the next phase.
- A published seed instrument (`work-attention`) ships so the catalog is not empty in development.

## Consequences

Old results stay tied to the version that produced them. A Likert UI can be replaced without changing session URLs.

## Alternatives considered

- One mutable `items` table without versions: cheaper now, breaks re-score later.
- Scoring inside the complete endpoint now: mixes persistence with a model we have not designed.
