import { spawnSync } from "node:child_process";

const docker = spawnSync("docker", ["compose", "version"], {
  encoding: "utf8",
  shell: true,
});

if (docker.status !== 0) {
  console.error(`Docker is not installed or not on PATH.

Install Docker Desktop for Windows, restart the terminal, then run:

  corepack pnpm db:up
  corepack pnpm db:migrate
  corepack pnpm dev

Until then, use PGlite in .env:

  DATABASE_URL=pglite:.data/mindmetric

Then:

  corepack pnpm db:migrate
  corepack pnpm dev
`);
  process.exit(1);
}

const up = spawnSync("docker", ["compose", "up", "-d", "--wait"], {
  stdio: "inherit",
  shell: true,
});

process.exit(up.status === null ? 1 : up.status);
