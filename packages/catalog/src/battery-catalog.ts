import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isSpanTrialContent,
  isSpeedFormDefinition,
  isSpeedTrialContent,
  SPAN_MIN_SCORED_LENGTH,
  SPEED_MIN_DECISIONS,
  SPEED_MIN_SAMPLE_DECISIONS,
} from "@mindmetric/shared";
import {
  assertUniqueBatteries,
  type BatteryDocument,
  parseBatteryDocument,
} from "./battery-document";
import {
  assertUniqueItemBanks,
  type ItemBankDocument,
  parseItemBankDocument,
} from "./item-bank";
import {
  assertUniqueQualityRuleSets,
  parseQualityRuleSetDocument,
  type QualityRuleSetDocument,
} from "./rule-set";
import {
  assertUniqueSubtestForms,
  parseSubtestFormDocument,
  type SubtestFormDocument,
} from "./subtest-form";

export type BatteryCatalog = {
  banks: ItemBankDocument[];
  forms: SubtestFormDocument[];
  batteries: BatteryDocument[];
  ruleSets: QualityRuleSetDocument[];
};

export type BatteryCatalogDirs = {
  items?: string;
  forms?: string;
  batteries?: string;
  rules?: string;
};

function packageDir() {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

export function catalogItemsDir() {
  return join(packageDir(), "items");
}

export function catalogFormsDir() {
  return join(packageDir(), "forms");
}

export function catalogBatteriesDir() {
  return join(packageDir(), "batteries");
}

export function catalogRulesDir() {
  return join(packageDir(), "rules");
}

function readDocuments<T>(
  directory: string,
  parse: (value: unknown, source: string) => T,
): T[] {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const raw = JSON.parse(
        readFileSync(join(directory, name), "utf8"),
      ) as unknown;
      return parse(raw, name);
    });
}

/**
 * Cross-layer integrity. A form may not reference a missing revision, two
 * revisions of one item, or a draft revision once the form is published.
 */
export function assertBatteryCatalogReferences(catalog: BatteryCatalog) {
  const revisions = new Map<
    string,
    {
      itemId: string;
      status: string;
      domain: string;
      decisions: number;
      length: number;
    }
  >();
  for (const bank of catalog.banks) {
    for (const item of bank.items) {
      for (const revision of item.revisions) {
        revisions.set(revision.id, {
          itemId: item.id,
          status: revision.status,
          domain: revision.content.domain,
          decisions: isSpeedTrialContent(revision.content)
            ? revision.content.decisions.length
            : 0,
          length: isSpanTrialContent(revision.content)
            ? revision.content.length
            : 0,
        });
      }
    }
  }

  const formVersions = new Map<
    string,
    { slug: string; domain: string; status: string }
  >();
  for (const form of catalog.forms) {
    for (const version of form.versions) {
      formVersions.set(version.id, {
        slug: form.slug,
        domain: form.domain,
        status: version.status,
      });

      const label = `Form ${form.slug} (${version.id})`;
      const referenced = [
        ...version.definition.itemRevisionIds,
        ...version.definition.sampleItemRevisionIds,
      ];
      const itemIds = new Set<string>();
      for (const revisionId of referenced) {
        const revision = revisions.get(revisionId);
        if (!revision) {
          throw new Error(
            `${label} references unknown item revision ${revisionId}.`,
          );
        }
        if (revision.domain !== form.domain) {
          throw new Error(
            `${label} references ${revisionId} from domain ${revision.domain}.`,
          );
        }
        if (version.status === "published" && revision.status !== "published") {
          throw new Error(
            `${label} is published but ${revisionId} is still a draft.`,
          );
        }
        if (itemIds.has(revision.itemId)) {
          throw new Error(
            `${label} uses two revisions of item ${revision.itemId}.`,
          );
        }
        itemIds.add(revision.itemId);
      }

      if (isSpeedFormDefinition(version.definition)) {
        for (const revisionId of version.definition.sampleItemRevisionIds) {
          const revision = revisions.get(revisionId);
          if (revision && revision.decisions < SPEED_MIN_SAMPLE_DECISIONS) {
            throw new Error(
              `${label} sample ${revisionId} has too few decisions.`,
            );
          }
        }
        for (const revisionId of version.definition.itemRevisionIds) {
          const revision = revisions.get(revisionId);
          if (revision && revision.decisions < SPEED_MIN_DECISIONS) {
            throw new Error(
              `${label} scored trial ${revisionId} has too few decisions.`,
            );
          }
        }
      }

      for (const revisionId of version.definition.itemRevisionIds) {
        const revision = revisions.get(revisionId);
        if (
          revision &&
          revision.length > 0 &&
          revision.length < SPAN_MIN_SCORED_LENGTH
        ) {
          throw new Error(
            `${label} scored trial ${revisionId} is shorter than the ladder.`,
          );
        }
      }
    }
  }

  for (const battery of catalog.batteries) {
    for (const version of battery.versions) {
      const label = `Battery ${battery.slug} (${version.id})`;
      for (const section of version.definition.sections) {
        const form = formVersions.get(section.formVersionId);
        if (!form) {
          throw new Error(
            `${label} references unknown form version ${section.formVersionId}.`,
          );
        }
        if (form.domain !== section.domain) {
          throw new Error(
            `${label} maps ${section.domain} onto ${form.slug}, which measures ${form.domain}.`,
          );
        }
        if (version.status === "published" && form.status !== "published") {
          throw new Error(
            `${label} is published but ${form.slug} (${section.formVersionId}) is still a draft.`,
          );
        }
      }
    }
  }
}

export function loadBatteryCatalog(dirs: BatteryCatalogDirs = {}) {
  const banks = readDocuments(
    dirs.items ?? catalogItemsDir(),
    parseItemBankDocument,
  );
  assertUniqueItemBanks(banks);

  const forms = readDocuments(
    dirs.forms ?? catalogFormsDir(),
    parseSubtestFormDocument,
  );
  assertUniqueSubtestForms(forms);

  const batteries = readDocuments(
    dirs.batteries ?? catalogBatteriesDir(),
    parseBatteryDocument,
  );
  assertUniqueBatteries(batteries);

  const ruleSets = readDocuments(
    dirs.rules ?? catalogRulesDir(),
    parseQualityRuleSetDocument,
  );
  assertUniqueQualityRuleSets(ruleSets);

  const catalog: BatteryCatalog = { banks, forms, batteries, ruleSets };
  assertBatteryCatalogReferences(catalog);
  return catalog;
}
