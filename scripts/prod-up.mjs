import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envFile = resolve(root, ".env.production");

const docker = spawnSync("docker", ["compose", "version"], {
  encoding: "utf8",
  shell: true,
});

if (docker.status !== 0) {
  console.error("Docker is not installed or not on PATH.");
  process.exit(1);
}

if (!existsSync(envFile)) {
  console.error(`Missing .env.production.

Copy the example, set BETTER_AUTH_SECRET and POSTGRES_PASSWORD, then retry:

  cp .env.production.example .env.production
  corepack pnpm prod:up
`);
  process.exit(1);
}

const up = spawnSync(
  "docker",
  [
    "compose",
    "-f",
    "docker-compose.prod.yml",
    "--env-file",
    ".env.production",
    "up",
    "--build",
    "-d",
    "--wait",
  ],
  {
    cwd: root,
    stdio: "inherit",
    shell: true,
  },
);

process.exit(up.status === null ? 1 : up.status);
