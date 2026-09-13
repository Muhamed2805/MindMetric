import {
  parseQualityRuleSetDefinition,
  QUALITY_RULES_ENGINE,
  type QualityRuleSetDefinition,
} from "@mindmetric/shared";
import { isCatalogSlug, type VersionStatus } from "./document";

export type QualityRuleVersionDocument = {
  id: string;
  version: number;
  status: VersionStatus;
  definition: QualityRuleSetDefinition;
};

/**
 * Validity thresholds are a versioned artifact so a result stays reproducible
 * under the rules it was judged by, and retuning means publishing a new version
 * rather than editing history (ADR 0017).
 */
export type QualityRuleSetDocument = {
  id: string;
  slug: string;
  title: string;
  description: string;
  engine: typeof QUALITY_RULES_ENGINE;
  versions: QualityRuleVersionDocument[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVersionStatus(value: unknown): value is VersionStatus {
  return value === "published" || value === "draft";
}

function parseRuleVersion(
  value: unknown,
  source: string,
): QualityRuleVersionDocument {
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
    definition: parseQualityRuleSetDefinition(
      value.definition,
      `${source} definition`,
    ),
  };
}

export function parseQualityRuleSetDocument(
  value: unknown,
  source = "quality rule set",
): QualityRuleSetDocument {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const { id, slug, title, description, engine, versions } = value;
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
  if (engine !== QUALITY_RULES_ENGINE) {
    throw new Error(`${source} (${slug}) must use ${QUALITY_RULES_ENGINE}.`);
  }
  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error(`${source} (${slug}) needs at least one version.`);
  }

  const parsed = versions.map((entry, index) =>
    parseRuleVersion(entry, `${source} (${slug}) version[${index}]`),
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
    engine: QUALITY_RULES_ENGINE,
    versions: parsed,
  };
}

export function assertUniqueQualityRuleSets(sets: QualityRuleSetDocument[]) {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const versionIds = new Set<string>();
  for (const set of sets) {
    if (ids.has(set.id) || slugs.has(set.slug)) {
      throw new Error(`Duplicate quality rule set id or slug: ${set.slug}`);
    }
    ids.add(set.id);
    slugs.add(set.slug);
    for (const version of set.versions) {
      if (versionIds.has(version.id)) {
        throw new Error(`Duplicate quality rule version id: ${version.id}`);
      }
      versionIds.add(version.id);
    }
  }
}
