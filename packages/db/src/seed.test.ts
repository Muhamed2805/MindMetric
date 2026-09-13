import { loadCatalogDocuments } from "@mindmetric/catalog";
import { LIKERT_ENGINE } from "@mindmetric/shared";
import { describe, expect, it } from "vitest";

describe("catalog seed documents", () => {
  it("publishes two distinct Likert scales with reverse keys", () => {
    const documents = loadCatalogDocuments();
    expect(documents.map((document) => document.slug)).toEqual([
      "work-attention",
      "work-emotion-awareness",
    ]);

    const ids = new Set<string>();
    for (const document of documents) {
      const published = document.versions.find(
        (version) => version.status === "published",
      );
      expect(published?.definition.engine).toBe(LIKERT_ENGINE);
      expect(published?.definition.scoring?.model).toBe("ctt-v1");
      expect(published?.definition.items.some((item) => item.reverse)).toBe(
        true,
      );
      for (const item of published?.definition.items ?? []) {
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);
      }
    }
  });
});
