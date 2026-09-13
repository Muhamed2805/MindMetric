import { LIKERT_ENGINE } from "@mindmetric/shared";
import { describe, expect, it } from "vitest";
import { seedInstruments } from "./seed";

describe("seedInstruments", () => {
  it("publishes two distinct Likert scales with reverse keys", () => {
    const slugs = seedInstruments.map((seed) => seed.slug);
    expect(slugs).toEqual(["work-attention", "work-emotion-awareness"]);

    const ids = new Set<string>();
    for (const seed of seedInstruments) {
      expect(seed.definition.engine).toBe(LIKERT_ENGINE);
      expect(seed.definition.scoring?.model).toBe("ctt-v1");
      expect(seed.definition.items.some((item) => item.reverse)).toBe(true);
      for (const item of seed.definition.items) {
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);
      }
    }
  });
});
