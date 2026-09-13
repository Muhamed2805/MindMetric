# ADR 0009: Catalog files, engines, and immutable versions

- Status: Accepted
- Date: 2026-09-13

## Context

Instruments lived as TypeScript in `seed.ts`. Seed overwrote published `definition` JSON on every migrate. That is fine for a demo Likert, and wrong once items, keys, or norms must stay replayable. A second engine (timed cognition, games) cannot be another branch inside the seed file.

## Decision

- Each instrument is a JSON document under `packages/catalog/instruments`. Adding a test is adding a file, not editing Nest or Next.
- `kind` is an engine id. The registry today is `likert-v1`. Unknown engines fail parse and seed.
- Seed upserts instrument title and description. It inserts missing versions. It never updates a published version's definition. If the file disagrees with a published row, migrate fails and the author must bump `version` with a new version id.
- Draft versions in a file may still be updated. Catalog HTTP keeps serving only `published`.
- `(instrument_id, version)` is unique.

## Consequences

Old sessions stay tied to the JSON they were scored against. Likert content changes require v2. Admin authoring and new engines are later phases; they plug into the same documents and registry.

## Alternatives considered

- Keep mutating published JSON in development: faster edits, silent rescoring of old sessions.
- Admin CMS in this phase: unreviewed items in production-shaped tables.
- YAML: nicer diffs, extra parser before we need it.
