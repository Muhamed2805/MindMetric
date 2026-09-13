import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import {
  createPgliteDb,
  createPostgresDb,
  findRepoRoot,
  isPgliteUrl,
  pgliteDir,
} from "./client";
import { seedCatalog } from "./seed";

const root = findRepoRoot();
const rootEnv = resolve(root, ".env");
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const migrationsFolder = join(root, "packages/db/drizzle");

function sleep(ms: number) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function waitForPostgres(target: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const client = postgres(target, { max: 1, connect_timeout: 2 });
    try {
      await client`select 1`;
      await client.end();
      return;
    } catch (cause) {
      lastError = cause;
      await client.end({ timeout: 1 }).catch(() => undefined);
      await sleep(1000);
    }
  }
  const detail = lastError instanceof Error ? lastError.message : "";
  throw new Error(
    `PostgreSQL is not reachable at DATABASE_URL. Start it with \`corepack pnpm db:up\` (Docker) or point DATABASE_URL at a running Postgres 16 instance.${detail ? ` ${detail}` : ""}`,
  );
}

async function migrateUrl(target: string, seed: boolean) {
  if (isPgliteUrl(target)) {
    const db = createPgliteDb(target);
    await migratePglite(db, { migrationsFolder });
    if (seed) {
      await seedCatalog(db);
    }
    await db.$client.close();
    return;
  }

  await waitForPostgres(target);
  const db = createPostgresDb(target);
  await migratePostgres(db, { migrationsFolder });
  if (seed) {
    await seedCatalog(db);
  }
  await db.$client.end();
}

if (isPgliteUrl(url)) {
  const apiUrl = process.env.API_DATABASE_URL ?? `${url}-api`;
  await migrateUrl(apiUrl, true);
  const webPid = join(pgliteDir(url), "postmaster.pid");
  if (existsSync(webPid)) {
    console.warn(
      "Skipped the web PGlite database because postmaster.pid is present. Stop the app before migrating auth tables.",
    );
  } else {
    await migrateUrl(url, false);
  }
} else {
  await migrateUrl(url, true);
}

console.log("Migrations applied.");
