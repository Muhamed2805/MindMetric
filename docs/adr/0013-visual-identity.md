# ADR 0013: Visual identity (Figma Make)

- Status: Accepted
- Date: 2026-09-13

## Context

ADR 0002 shipped tokens and chrome; ADR 0010 fixed information architecture. The product still read as a warm teal starter: IBM Plex everywhere, rounded cards, light sidebar. That fights the next work (a long cognitive battery that should feel like an examination, not a wellness app).

## Decision

- Pair **Lora** (`font-serif`) with **Inter** (`font-sans`), matching the Figma Make mock (`iframe-view-23184258.figma.site`).
- Tokens follow that mock: canvas `#f5f2ea`, navy `#173a56`, cream surface, 8–16px radii. Dark-theme variables stay unused (no toggle).
- Marketing chrome is a light top bar (Assessments / Brain Games / How It Works). Workspace stays a sidebar, on the same cream paper — not a second dark brand.
- Cards are cream panels with a hairline and large radius. The landing sample IQ card is illustration, not a live score.

## Consequences

A later IQ report page can sit on the same type and navy without another token rewrite. Personality (when it comes) should reuse this language, not invent a second brand.

## Alternatives considered

- Dark mode as the default: harder to read long stems; the mock is light paper.
- Keeping teal or the sharp exam-board rail: fights the Figma Make marketing chrome.
- Shipping fake “40k assessments” and a live IQ of 121: the mock uses those as illustration only.
