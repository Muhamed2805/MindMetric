import {
  isPowerDomain,
  POWER_MCQ_ENGINE,
  type PowerDomain,
  type PowerMcqItemContent,
  parsePowerMcqItemContent,
  parseSpanTrialContent,
  parseSpeedTrialContent,
  SPAN_TRIAL_ENGINE,
  SPEED_TRIAL_ENGINE,
  type SpanTrialContent,
  type SpeedTrialContent,
} from "@mindmetric/shared";
import { isCatalogSlug, type VersionStatus } from "./document";

export type ItemContent =
  | PowerMcqItemContent
  | SpeedTrialContent
  | SpanTrialContent;

export type ItemRevisionDocument = {
  id: string;
  revision: number;
  status: VersionStatus;
  content: ItemContent;
};

export type ItemDocument = {
  id: string;
  revisions: ItemRevisionDocument[];
};

export type ItemBankDomain = PowerDomain | "gs" | "gwm";
export type ItemBankEngine =
  | typeof POWER_MCQ_ENGINE
  | typeof SPEED_TRIAL_ENGINE
  | typeof SPAN_TRIAL_ENGINE;

/**
 * One bank file holds many items, each with its own revision history. Forms
 * pin revisions, so an item keeps a single identity across forms (ADR 0015).
 */
export type ItemBankDocument = {
  id: string;
  slug: string;
  domain: ItemBankDomain;
  engine: ItemBankEngine;
  items: ItemDocument[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVersionStatus(value: unknown): value is VersionStatus {
  return value === "published" || value === "draft";
}

function parseItemContent(
  value: unknown,
  domain: ItemBankDomain,
  engine: ItemBankEngine,
  source: string,
): ItemContent {
  if (engine === SPEED_TRIAL_ENGINE) {
    const content = parseSpeedTrialContent(value, source);
    if (content.domain !== domain) {
      throw new Error(
        `${source} content domain does not match the bank domain.`,
      );
    }
    return content;
  }
  if (engine === SPAN_TRIAL_ENGINE) {
    const content = parseSpanTrialContent(value, source);
    if (content.domain !== domain) {
      throw new Error(
        `${source} content domain does not match the bank domain.`,
      );
    }
    return content;
  }
  const content = parsePowerMcqItemContent(value, source);
  if (content.domain !== domain) {
    throw new Error(`${source} content domain does not match the bank domain.`);
  }
  return content;
}

function parseItemRevision(
  value: unknown,
  domain: ItemBankDomain,
  engine: ItemBankEngine,
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
  const content = parseItemContent(
    value.content,
    domain,
    engine,
    `${source} content`,
  );
  return { id, revision, status, content };
}

function parseItem(
  value: unknown,
  domain: ItemBankDomain,
  engine: ItemBankEngine,
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
    parseItemRevision(entry, domain, engine, `${source} revision[${index}]`),
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
  const bankEngine =
    engine === SPEED_TRIAL_ENGINE
      ? SPEED_TRIAL_ENGINE
      : engine === SPAN_TRIAL_ENGINE
        ? SPAN_TRIAL_ENGINE
        : engine === POWER_MCQ_ENGINE
          ? POWER_MCQ_ENGINE
          : null;
  if (!bankEngine) {
    throw new Error(`${source} (${slug}) has an unknown engine.`);
  }
  let bankDomain: ItemBankDomain;
  if (bankEngine === SPEED_TRIAL_ENGINE) {
    if (domain !== "gs") {
      throw new Error(`${source} (${slug}) speed trials must measure gs.`);
    }
    bankDomain = "gs";
  } else if (bankEngine === SPAN_TRIAL_ENGINE) {
    if (domain !== "gwm") {
      throw new Error(`${source} (${slug}) span trials must measure gwm.`);
    }
    bankDomain = "gwm";
  } else if (!isPowerDomain(domain)) {
    throw new Error(`${source} (${slug}) has an unknown domain.`);
  } else {
    bankDomain = domain;
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`${source} (${slug}) needs at least one item.`);
  }

  const parsed = items.map((entry, index) =>
    parseItem(
      entry,
      bankDomain,
      bankEngine,
      `${source} (${slug}) item[${index}]`,
    ),
  );

  return { id, slug, domain: bankDomain, engine: bankEngine, items: parsed };
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
