import {
  type EngineDefinition,
  parseEngineDefinition,
} from "@mindmetric/shared";

export const VERSION_STATUSES = ["published", "draft"] as const;

export type VersionStatus = (typeof VERSION_STATUSES)[number];

export type CatalogVersion = {
  id: string;
  version: number;
  status: VersionStatus;
  definition: EngineDefinition;
};

export type CatalogDocument = {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: string;
  versions: CatalogVersion[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVersionStatus(value: unknown): value is VersionStatus {
  return value === "published" || value === "draft";
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isCatalogSlug(value: unknown): value is string {
  return typeof value === "string" && slugPattern.test(value);
}

export function parseCatalogDocument(
  value: unknown,
  source = "instrument",
): CatalogDocument {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }

  const { id, slug, title, description, kind, versions } = value;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`${source} is missing id.`);
  }
  if (typeof slug !== "string" || !slugPattern.test(slug)) {
    throw new Error(`${source} has an invalid slug.`);
  }
  if (typeof title !== "string" || title.length === 0) {
    throw new Error(`${source} (${slug}) is missing title.`);
  }
  if (typeof description !== "string" || description.length === 0) {
    throw new Error(`${source} (${slug}) is missing description.`);
  }
  if (typeof kind !== "string") {
    throw new Error(`${source} (${slug}) is missing kind.`);
  }
  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error(`${source} (${slug}) needs at least one version.`);
  }

  const parsedVersions = versions.map((entry, index) =>
    parseCatalogVersion(entry, kind, `${source} (${slug}) version[${index}]`),
  );

  const ids = new Set<string>();
  const numbers = new Set<number>();
  let published = 0;
  for (const version of parsedVersions) {
    if (ids.has(version.id) || numbers.has(version.version)) {
      throw new Error(
        `${source} (${slug}) has duplicate version ids or numbers.`,
      );
    }
    ids.add(version.id);
    numbers.add(version.version);
    if (version.status === "published") {
      published += 1;
    }
  }
  if (published < 1) {
    throw new Error(`${source} (${slug}) needs a published version.`);
  }

  return {
    id,
    slug,
    title,
    description,
    kind,
    versions: parsedVersions,
  };
}

function parseCatalogVersion(
  value: unknown,
  kind: string,
  source: string,
): CatalogVersion {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const { id, version, status, definition } = value;
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
    definition: parseEngineDefinition(kind, definition),
  };
}

export function assertUniqueCatalog(documents: CatalogDocument[]) {
  const slugs = new Set<string>();
  const ids = new Set<string>();
  const versionIds = new Set<string>();
  for (const document of documents) {
    if (slugs.has(document.slug) || ids.has(document.id)) {
      throw new Error(`Duplicate instrument id or slug: ${document.slug}`);
    }
    slugs.add(document.slug);
    ids.add(document.id);
    for (const version of document.versions) {
      if (versionIds.has(version.id)) {
        throw new Error(`Duplicate version id: ${version.id}`);
      }
      versionIds.add(version.id);
    }
  }
}
