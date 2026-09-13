import {
  isPowerDomain,
  POWER_MCQ_ENGINE,
  type PowerDomain,
  type PowerMcqItemContent,
  parsePowerMcqItemContent,
} from "@mindmetric/shared";
import { isCatalogSlug, type VersionStatus } from "./document";

export type ItemRevisionDocument = {
  id: string;
  revision: number;
  status: VersionStatus;
  content: PowerMcqItemContent;
};

export type ItemDocument = {
  id: string;
  revisions: ItemRevisionDocument[];
};

/**
 * One bank file holds many items, each with its own revision history. Forms
 * pin revisions, so an item keeps a single identity across forms (ADR 0015).
 */
export type ItemBankDocument = {
  id: string;
  slug: string;
  domain: PowerDomain;
  engine: typeof POWER_MCQ_ENGINE;
  items: ItemDocument[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVersionStatus(value: unknown): value is VersionStatus {
  return value === "published" || value === "draft";
}

function parseItemRevision(
  value: unknown,
  domain: PowerDomain,
  source: string,
): ItemRevisionDocument {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const { id, revision, status } = value;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`${source} is missing id.`);
  }
  if (
    typeof revision !== "number" ||
    !Number.isInteger(revision) ||
    revision < 1
  ) {
    throw new Error(`${source} has an invalid revision number.`);
  }
  if (!isVersionStatus(status)) {
    throw new Error(`${source} has an invalid status.`);
  }
  const content = parsePowerMcqItemContent(value.content, `${source} content`);
  if (content.domain !== domain) {
    throw new Error(`${source} content domain does not match the bank domain.`);
  }
  return { id, revision, status, content };
}

function parseItem(
  value: unknown,
  domain: PowerDomain,
  source: string,
): ItemDocument {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const { id, revisions } = value;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`${source} is missing id.`);
  }
  if (!Array.isArray(revisions) || revisions.length === 0) {
    throw new Error(`${source} needs at least one revision.`);
  }

  const parsed = revisions.map((entry, index) =>
    parseItemRevision(entry, domain, `${source} revision[${index}]`),
  );

  const ids = new Set<string>();
  const numbers = new Set<number>();
  for (const revision of parsed) {
    if (ids.has(revision.id) || numbers.has(revision.revision)) {
      throw new Error(`${source} has duplicate revision ids or numbers.`);
    }
    ids.add(revision.id);
    numbers.add(revision.revision);
  }

  return { id, revisions: parsed };
}

export function parseItemBankDocument(
  value: unknown,
  source = "item bank",
): ItemBankDocument {
  if (!isRecord(value)) {
    throw new Error(`${source} is not an object.`);
  }
  const { id, slug, domain, engine, items } = value;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`${source} is missing id.`);
  }
  if (!isCatalogSlug(slug)) {
    throw new Error(`${source} has an invalid slug.`);
  }
  if (!isPowerDomain(domain)) {
    throw new Error(`${source} (${slug}) has an unknown domain.`);
  }
  if (engine !== POWER_MCQ_ENGINE) {
    throw new Error(`${source} (${slug}) must use ${POWER_MCQ_ENGINE}.`);
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`${source} (${slug}) needs at least one item.`);
  }

  const parsed = items.map((entry, index) =>
    parseItem(entry, domain, `${source} (${slug}) item[${index}]`),
  );

  return { id, slug, domain, engine: POWER_MCQ_ENGINE, items: parsed };
}

export function assertUniqueItemBanks(banks: ItemBankDocument[]) {
  const bankIds = new Set<string>();
  const slugs = new Set<string>();
  const itemIds = new Set<string>();
  const revisionIds = new Set<string>();

  for (const bank of banks) {
    if (bankIds.has(bank.id) || slugs.has(bank.slug)) {
      throw new Error(`Duplicate item bank id or slug: ${bank.slug}`);
    }
    bankIds.add(bank.id);
    slugs.add(bank.slug);

    for (const item of bank.items) {
      if (itemIds.has(item.id)) {
        throw new Error(`Duplicate item id: ${item.id}`);
      }
      itemIds.add(item.id);
      for (const revision of item.revisions) {
        if (revisionIds.has(revision.id)) {
          throw new Error(`Duplicate item revision id: ${revision.id}`);
        }
        revisionIds.add(revision.id);
      }
    }
  }
}
