import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
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
