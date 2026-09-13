import {
  isPowerDomain,
  POWER_FORM_ENGINE,
  type PowerDomain,
  type PowerFormDefinition,
  parsePowerFormDefinition,
} from "@mindmetric/shared";
import { isCatalogSlug, type VersionStatus } from "./document";

export type SubtestFormVersionDocument = {
  id: string;
  version: number;
  status: VersionStatus;
  definition: PowerFormDefinition;
};

/**
 * A subtest form is a versioned selection of item revisions. It is not an
 * instrument: only a battery administers it (ADR 0014).
 */
export type SubtestFormDocument = {
  id: string;
  slug: string;
  title: string;
  description: string;
  domain: PowerDomain;
  engine: typeof POWER_FORM_ENGINE;
  versions: SubtestFormVersionDocument[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVersionStatus(value: unknown): value is VersionStatus {
  return value === "published" || value === "draft";
}

function parseFormVersion(
  value: unknown,
  domain: PowerDomain,
  source: string,
): SubtestFormVersionDocument {
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
  const definition = parsePowerFormDefinition(
    value.definition,
    `${source} definition`,
  );
  if (definition.domain !== domain) {
    throw new Error(`${source} definition domain does not match the form.`);
  }
  return { id, version, status, definition };
}

export function parseSubtestFormDocument(
  value: unknown,
  source = "subtest form",
): SubtestFormDocument {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const { id, slug, title, description, domain, engine, versions } = value;
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
  if (!isPowerDomain(domain)) {
    throw new Error(`${source} (${slug}) has an unknown domain.`);
  }
  if (engine !== POWER_FORM_ENGINE) {
    throw new Error(`${source} (${slug}) must use ${POWER_FORM_ENGINE}.`);
  }
  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error(`${source} (${slug}) needs at least one version.`);
  }

  const parsed = versions.map((entry, index) =>
    parseFormVersion(entry, domain, `${source} (${slug}) version[${index}]`),
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

  return {
    id,
    slug,
    title,
    description,
    domain,
    engine: POWER_FORM_ENGINE,
    versions: parsed,
  };
}

export function assertUniqueSubtestForms(forms: SubtestFormDocument[]) {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const versionIds = new Set<string>();
  for (const form of forms) {
    if (ids.has(form.id) || slugs.has(form.slug)) {
      throw new Error(`Duplicate subtest form id or slug: ${form.slug}`);
    }
    ids.add(form.id);
    slugs.add(form.slug);
    for (const version of form.versions) {
      if (versionIds.has(version.id)) {
        throw new Error(`Duplicate form version id: ${version.id}`);
      }
      versionIds.add(version.id);
    }
  }
}
