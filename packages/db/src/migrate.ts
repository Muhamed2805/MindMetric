import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import {
  createPgliteDb,
  createPostgresDb,
  findRepoRoot,
  isPgliteUrl,
} from "./client";

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

if (isPgliteUrl(url)) {
  await migratePglite(createPgliteDb(url), { migrationsFolder });
} else {
  const db = createPostgresDb(url);
  await migratePostgres(db, { migrationsFolder });
  await db.$client.end();
}

console.log("Migrations applied.");
