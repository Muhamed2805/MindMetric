# ADR 0003: Identity and session cookies

- Status: Accepted
- Date: 2026-09-12

## Context

Workspace routes must be authenticated. Session cookies only work reliably as first-party cookies on the web origin (`localhost:3000` in development). A Nest process on another port cannot set those cookies without a reverse proxy.

## Decision

- PostgreSQL stores users, sessions, accounts, and verifications.
- Better Auth handles password hashing, session rotation, and cookie flags (`httpOnly`, `SameSite=Lax`, `Secure` in production).
- Auth HTTP routes live on the web origin at `/api/auth/*` (Next.js).
- Nest reads the same session from Postgres (via Better Auth `getSession`) for `/v1/me` and future API routes. Health stays public.
- Default role is `user`. `admin` is not self-assignable on sign-up (`input: false`).
- Next.js `proxy` only checks that a session cookie exists (optimistic). Workspace layouts and Nest guards validate the session.
- Local development may use PGlite (`pglite:` URL) so the app runs without Docker. CI and production use PostgreSQL.

## Consequences

Sign-up, sign-in, and logout work without a third-party auth vendor. Domain APIs on Nest can authorize with the same cookie after the Next rewrite forwards it.

## Alternatives considered

- Auth handler only on Nest (`:3001`): cross-origin cookies on another port are brittle in local and in some production splits.
- Clerk/Auth0: faster UI, weaker control over assessment PII.
- JWT in `localStorage`: XSS can steal the token.
