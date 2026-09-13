import { loadCatalogDocuments } from "@mindmetric/catalog";
import {
  isLikertDefinition,
  isMcqTimedDefinition,
  LIKERT_ENGINE,
  MCQ_TIMED_ENGINE,
} from "@mindmetric/shared";
import { describe, expect, it } from "vitest";

describe("catalog seed documents", () => {
  it("publishes Likert scales and a timed MCQ set", () => {
    const documents = loadCatalogDocuments();
    expect(documents.map((document) => document.slug)).toEqual([
      "quick-pattern-reasoning",
      "work-attention",
      "work-emotion-awareness",
    ]);

    const ids = new Set<string>();
    for (const document of documents) {
      const published = document.versions.find(
        (version) => version.status === "published",
      );
      const definition = published?.definition;
      expect(definition).toBeDefined();
      if (isLikertDefinition(definition)) {
        expect(definition.engine).toBe(LIKERT_ENGINE);
        expect(definition.scoring?.model).toBe("ctt-v1");
        expect(definition.items.some((item) => item.reverse)).toBe(true);
        for (const item of definition.items) {
          expect(ids.has(item.id)).toBe(false);
          ids.add(item.id);
        }
      } else if (isMcqTimedDefinition(definition)) {
        expect(definition.engine).toBe(MCQ_TIMED_ENGINE);
        expect(definition.scoring?.model).toBe("sum-correct-v1");
        for (const item of definition.items) {
          expect(ids.has(item.id)).toBe(false);
          ids.add(item.id);
        }
      } else {
        throw new Error(`Unexpected engine for ${document.slug}`);
      }
    }
  });
});
