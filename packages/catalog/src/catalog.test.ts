import { isLikertDefinition, LIKERT_ENGINE } from "@mindmetric/shared";
import { describe, expect, it } from "vitest";
import { parseCatalogDocument } from "./document";
import { loadCatalogDocuments } from "./load";
import { planVersionWrite } from "./publish";

const baseLikert = {
  engine: LIKERT_ENGINE,
  items: [
    {
      id: "q1",
      type: "likert",
      prompt: "I finish work I start.",
      scale: {
        min: 1,
        max: 5,
        anchors: [
          { value: 1, label: "Low" },
          { value: 5, label: "High" },
        ],
      },
    },
  ],
};

describe("loadCatalogDocuments", () => {
  it("loads published instruments from files", () => {
    const documents = loadCatalogDocuments();
    expect(documents.map((document) => document.slug)).toEqual([
      "five-factor-profile",
      "quick-pattern-reasoning",
      "work-attention",
      "work-emotion-awareness",
    ]);
    for (const document of documents) {
      expect(
        document.versions.some((version) => version.status === "published"),
      ).toBe(true);
    }
  });

  it("ships a five-factor self-report with keyed facets", () => {
    const documents = loadCatalogDocuments();
    const personality = documents.find(
      (document) => document.slug === "five-factor-profile",
    );
    const definition = personality?.versions[0]?.definition;
    expect(isLikertDefinition(definition)).toBe(true);
    if (!isLikertDefinition(definition)) {
      return;
    }
    expect(definition.items.length).toBe(25);
    expect(definition.scoring?.facets?.map((facet) => facet.id)).toEqual([
      "openness",
      "conscientiousness",
      "extraversion",
      "agreeableness",
      "stability",
    ]);
  });
});

describe("parseCatalogDocument", () => {
  it("rejects an unknown engine", () => {
    expect(() =>
      parseCatalogDocument({
        id: "inst_x",
        slug: "timed-iq",
        title: "Timed IQ",
        description: "Not registered yet.",
        kind: "iq-v1",
        versions: [
          {
            id: "ver_x_1",
            version: 1,
            status: "published",
            definition: { engine: "iq-v1", items: [] },
          },
        ],
      }),
    ).toThrow(/Unknown instrument engine/);
  });
});

describe("planVersionWrite", () => {
  it("inserts a missing version", () => {
    expect(
      planVersionWrite(
        undefined,
        {
          id: "ver_1",
          status: "published",
          definition: baseLikert,
        },
        "demo",
      ),
    ).toBe("insert");
  });

  it("skips a published version that still matches", () => {
    expect(
      planVersionWrite(
        { id: "ver_1", status: "published", definition: baseLikert },
        { id: "ver_1", status: "published", definition: { ...baseLikert } },
        "demo",
      ),
    ).toBe("skip");
  });

  it("refuses to rewrite a published definition", () => {
    const first = baseLikert.items[0];
    if (!first) {
      throw new Error("expected a likert item");
    }
    expect(() =>
      planVersionWrite(
        { id: "ver_1", status: "published", definition: baseLikert },
        {
          id: "ver_1",
          status: "published",
          definition: {
            ...baseLikert,
            items: [
              {
                ...first,
                prompt: "Changed prompt.",
              },
            ],
          },
        },
        "demo",
      ),
    ).toThrow(/Bump version/);
  });
});
