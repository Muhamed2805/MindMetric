import {
  type BatteryDefinition,
  parseBatteryDefinition,
} from "@mindmetric/shared";
import { isCatalogSlug, type VersionStatus } from "./document";

export type BatteryVersionDocument = {
  id: string;
  version: number;
  status: VersionStatus;
  definition: BatteryDefinition;
};

/** The battery is the takeable product; its sections point at subtest forms. */
export type BatteryDocument = {
  id: string;
  slug: string;
  title: string;
  description: string;
  versions: BatteryVersionDocument[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVersionStatus(value: unknown): value is VersionStatus {
  return value === "published" || value === "draft";
}

function parseBatteryVersion(
  value: unknown,
  source: string,
): BatteryVersionDocument {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const { id, version, status } = value;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`${source} is missing id.`);
  }
  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    throw new Error(`${source} has an invalid version number.`);
  }
  if (!isVersionStatus(status)) {
    throw new Error(`${source} has an invalid status.`);
  }
  return {
    id,
    version,
    status,
    definition: parseBatteryDefinition(
      value.definition,
      `${source} definition`,
    ),
  };
}

export function parseBatteryDocument(
  value: unknown,
  source = "battery",
): BatteryDocument {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const { id, slug, title, description, versions } = value;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`${source} is missing id.`);
  }
  if (!isCatalogSlug(slug)) {
    throw new Error(`${source} has an invalid slug.`);
  }
  if (typeof title !== "string" || title.length === 0) {
    throw new Error(`${source} (${slug}) is missing title.`);
  }
  if (typeof description !== "string" || description.length === 0) {
    throw new Error(`${source} (${slug}) is missing description.`);
  }
  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error(`${source} (${slug}) needs at least one version.`);
  }

  const parsed = versions.map((entry, index) =>
    parseBatteryVersion(entry, `${source} (${slug}) version[${index}]`),
  );

  const ids = new Set<string>();
  const numbers = new Set<number>();
  for (const version of parsed) {
    if (ids.has(version.id) || numbers.has(version.version)) {
      throw new Error(
        `${source} (${slug}) has duplicate version ids or numbers.`,
      );
    }
    ids.add(version.id);
    numbers.add(version.version);
  }

  return { id, slug, title, description, versions: parsed };
}

export function assertUniqueBatteries(batteries: BatteryDocument[]) {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const versionIds = new Set<string>();
  for (const battery of batteries) {
    if (ids.has(battery.id) || slugs.has(battery.slug)) {
      throw new Error(`Duplicate battery id or slug: ${battery.slug}`);
    }
    ids.add(battery.id);
    slugs.add(battery.slug);
    for (const version of battery.versions) {
      if (versionIds.has(version.id)) {
        throw new Error(`Duplicate battery version id: ${version.id}`);
      }
      versionIds.add(version.id);
    }
  }
}
