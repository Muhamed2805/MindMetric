import { LIKERT_ENGINE } from "@mindmetric/shared";
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
  it("loads the published Likert instruments from files", () => {
    const documents = loadCatalogDocuments();
    expect(documents.map((document) => document.slug)).toEqual([
      "work-attention",
      "work-emotion-awareness",
    ]);
    for (const document of documents) {
      expect(document.kind).toBe(LIKERT_ENGINE);
      expect(
        document.versions.some((version) => version.status === "published"),
      ).toBe(true);
    }
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
        kind: "mcq-timed-v1",
        versions: [
          {
            id: "ver_x_1",
            version: 1,
            status: "published",
            definition: { engine: "mcq-timed-v1", items: [] },
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
