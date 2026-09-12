# MindMetric

Web platform for psychometric and cognitive assessments.

## Requirements

- Node.js 22.12 or newer
- pnpm 10, via Corepack (`corepack enable`, then `corepack prepare pnpm@10.17.1 --activate`)

## Local development

```sh
cp .env.example .env
corepack pnpm install
corepack pnpm dev
```

- Web: http://localhost:3000
- Workspace: http://localhost:3000/home
- API health: http://localhost:3001/health

## Scripts

| Command | Purpose |
| --- | --- |
| `corepack pnpm dev` | Run web and API |
| `corepack pnpm lint` | Lint and format check |
| `corepack pnpm typecheck` | TypeScript across workspaces |
| `corepack pnpm test` | Unit tests |
| `corepack pnpm build` | Production build |

Architecture decisions live in `docs/adr`.
