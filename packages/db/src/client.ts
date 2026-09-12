import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

export function findRepoRoot(start = process.cwd()) {
  let dir = start;
  while (true) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("Could not find the repository root.");
    }
    dir = parent;
  }
}

export function isPgliteUrl(url: string) {
  return url.startsWith("pglite:");
}

export function pgliteDir(url: string) {
  const raw = url.slice("pglite:".length);
  return isAbsolute(raw) ? raw : resolve(findRepoRoot(), raw);
}

export function createPgliteDb(url: string) {
  const dir = pgliteDir(url);
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  return drizzlePglite({ client, schema });
}

export function createPostgresDb(url: string) {
  const client = postgres(url, { max: 10 });
  return drizzlePostgres({ client, schema });
}

export function createDb(url: string) {
  return isPgliteUrl(url) ? createPgliteDb(url) : createPostgresDb(url);
}

let db: Database | undefined;

export function getDb() {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    db = createDb(url);
  }

  return db;
}
