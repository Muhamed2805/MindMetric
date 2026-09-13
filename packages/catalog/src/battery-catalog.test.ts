import { describe, expect, it } from "vitest";
import {
  assertBatteryCatalogReferences,
  type BatteryCatalog,
  loadBatteryCatalog,
} from "./battery-catalog";
import { parseBatteryDocument } from "./battery-document";
import { type ItemBankDocument, parseItemBankDocument } from "./item-bank";
import { parseSubtestFormDocument } from "./subtest-form";

function bankWith(status: "published" | "draft"): ItemBankDocument {
  return parseItemBankDocument({
    id: "bank_x",
    slug: "bank-x",
    domain: "gf",
    engine: "power-mcq-v1",
    items: [
      {
        id: "x-1",
        revisions: [
          {
            id: "x-1-r1",
            revision: 1,
            status,
            content: {
              engine: "power-mcq-v1",
              domain: "gf",
              difficulty: "easy",
              stimulus: { type: "text", text: "1, 2, 3, ?" },
              correctChoiceId: "a",
              choices: [
                { id: "a", content: { type: "text", text: "4" } },
                { id: "b", content: { type: "text", text: "5" } },
              ],
            },
          },
          {
            id: "x-1-r2",
            revision: 2,
            status: "draft",
            content: {
              engine: "power-mcq-v1",
              domain: "gf",
              difficulty: "easy",
              stimulus: { type: "text", text: "1, 2, 3, ??" },
              correctChoiceId: "a",
              choices: [
                { id: "a", content: { type: "text", text: "4" } },
                { id: "b", content: { type: "text", text: "6" } },
              ],
            },
          },
        ],
      },
    ],
  });
}

function formWith(status: "published" | "draft", itemRevisionIds: string[]) {
  return parseSubtestFormDocument({
    id: "form_x",
    slug: "form-x",
    title: "Form X",
    description: "Fixture",
    domain: "gf",
    engine: "power-form-v1",
    versions: [
      {
        id: "form_x_v1",
        version: 1,
        status,
        definition: {
          engine: "power-form-v1",
          domain: "gf",
          scoringModel: "accuracy-power-v1",
          sectionTimeLimitMs: 300000,
          itemCeilingMs: 90000,
          itemRevisionIds,
        },
      },
    ],
  });
}

function batteryWith(status: "published" | "draft", domain: string) {
  return parseBatteryDocument({
    id: "bat_x",
    slug: "bat-x",
    title: "Battery X",
    description: "Fixture",
    versions: [
      {
        id: "bat_x_v1",
        version: 1,
        status,
        definition: {
          engine: "battery-v1",
          sections: [{ position: 1, domain, formVersionId: "form_x_v1" }],
        },
      },
    ],
  });
}

function catalog(overrides: Partial<BatteryCatalog>): BatteryCatalog {
  return {
    banks: [bankWith("published")],
    forms: [formWith("published", ["x-1-r1"])],
    batteries: [batteryWith("published", "gf")],
    ruleSets: [],
    ...overrides,
  };
}

describe("assertBatteryCatalogReferences", () => {
  it("accepts a consistent catalog", () => {
    expect(() => assertBatteryCatalogReferences(catalog({}))).not.toThrow();
  });

  it("rejects a form that references a missing revision", () => {
    expect(() =>
      assertBatteryCatalogReferences(
        catalog({ forms: [formWith("draft", ["x-9-r1"])] }),
      ),
    ).toThrow(/unknown item revision x-9-r1/);
  });

  it("rejects a published form built on a draft revision", () => {
    expect(() =>
      assertBatteryCatalogReferences(catalog({ banks: [bankWith("draft")] })),
    ).toThrow(/still a draft/);
  });

  it("rejects a form using two revisions of one item", () => {
    expect(() =>
      assertBatteryCatalogReferences(
        catalog({ forms: [formWith("draft", ["x-1-r1", "x-1-r2"])] }),
      ),
    ).toThrow(/two revisions of item x-1/);
  });

  it("rejects a battery that maps the wrong domain onto a form", () => {
    expect(() =>
      assertBatteryCatalogReferences(
        catalog({ batteries: [batteryWith("draft", "gv")] }),
      ),
    ).toThrow(/measures gf/);
  });

  it("rejects a published battery built on a draft form", () => {
    expect(() =>
      assertBatteryCatalogReferences(
        catalog({ forms: [formWith("draft", ["x-1-r1"])] }),
      ),
    ).toThrow(/still a draft/);
  });

  it("rejects a Gs form whose scored trial is too short", () => {
    const decisions = Array.from({ length: 4 }, (_, index) => ({
      id: `d${index + 1}`,
      same: index % 2 === 0,
      left: { kind: "single", elements: [{ shape: "circle", fill: "solid" }] },
      right: {
        kind: "single",
        elements: [
          {
            shape: index % 2 === 0 ? "circle" : "square",
            fill: "solid",
          },
        ],
      },
    }));

    expect(() =>
      assertBatteryCatalogReferences({
        banks: [
          parseItemBankDocument({
            id: "bank_gs",
            slug: "bank-gs",
            domain: "gs",
            engine: "speed-trial-v1",
            items: [
              {
                id: "gs-1",
                revisions: [
                  {
                    id: "gs-1-r1",
                    revision: 1,
                    status: "draft",
                    content: {
                      engine: "speed-trial-v1",
                      domain: "gs",
                      prompt: "Same or different?",
                      k: 2,
                      decisions,
                    },
                  },
                ],
              },
            ],
          }),
        ],
        forms: [
          parseSubtestFormDocument({
            id: "form_gs",
            slug: "form-gs",
            title: "Form Gs",
            description: "Fixture",
            domain: "gs",
            engine: "speed-form-v1",
            versions: [
              {
                id: "form_gs_v1",
                version: 1,
                status: "draft",
                definition: {
                  engine: "speed-form-v1",
                  domain: "gs",
                  scoringModel: "speed-corrected-v1",
                  trialTimeLimitMs: 90_000,
                  itemRevisionIds: ["gs-1-r1"],
                },
              },
            ],
          }),
        ],
        batteries: [],
        ruleSets: [],
      }),
    ).toThrow(/too few decisions/);
  });
});

describe("loadBatteryCatalog", () => {
  it("loads the shipped battery catalog and checks its references", () => {
    const loaded = loadBatteryCatalog();
    const form = loaded.forms.find((entry) => entry.slug === "gf-matrix-pilot");
    const scored = form?.versions[0]?.definition.itemRevisionIds ?? [];

    expect(loaded.batteries).toHaveLength(4);
    expect(scored.length).toBeGreaterThan(0);
    expect(loaded.forms.map((entry) => entry.slug)).toEqual(
      expect.arrayContaining([
        "gf-matrix-pilot",
        "gs-same-different-pilot",
        "rq-quant-pilot",
        "gv-rotation-pilot",
      ]),
    );
  });

  it("ships a draft Gs same/different form that is not on the core battery", () => {
    const loaded = loadBatteryCatalog();
    const form = loaded.forms.find(
      (entry) => entry.slug === "gs-same-different-pilot",
    );
    const core = loaded.batteries.find(
      (entry) => entry.slug === "core-cognitive",
    );
    const gsBattery = loaded.batteries.find(
      (entry) => entry.slug === "gs-same-different-pilot",
    );
    const coreDomains =
      core?.versions[0]?.definition.sections.map((section) => section.domain) ??
      [];

    expect(form?.engine).toBe("speed-form-v1");
    expect(form?.versions[0]?.definition.itemRevisionIds).toHaveLength(2);
    expect(coreDomains).not.toContain("gs");
    expect(coreDomains).not.toContain("rq");
    expect(coreDomains).not.toContain("gv");
    expect(
      gsBattery?.versions[0]?.definition.sections.map(
        (section) => section.domain,
      ),
    ).toEqual(["gs"]);
  });

  it("ships a draft RQ form that is not on the core battery", () => {
    const loaded = loadBatteryCatalog();
    const form = loaded.forms.find((entry) => entry.slug === "rq-quant-pilot");
    const rqBattery = loaded.batteries.find(
      (entry) => entry.slug === "rq-quant-pilot",
    );

    expect(form?.engine).toBe("power-form-v1");
    expect(form?.versions[0]?.definition.itemRevisionIds).toHaveLength(10);
    expect(
      rqBattery?.versions[0]?.definition.sections.map(
        (section) => section.domain,
      ),
    ).toEqual(["rq"]);
  });

  it("ships a draft Gv rotation form that is not on the core battery", () => {
    const loaded = loadBatteryCatalog();
    const form = loaded.forms.find(
      (entry) => entry.slug === "gv-rotation-pilot",
    );
    const gvBattery = loaded.batteries.find(
      (entry) => entry.slug === "gv-rotation-pilot",
    );

    expect(form?.engine).toBe("power-form-v1");
    expect(form?.versions[0]?.definition.itemRevisionIds).toHaveLength(8);
    expect(
      gvBattery?.versions[0]?.definition.sections.map(
        (section) => section.domain,
      ),
    ).toEqual(["gv"]);
  });

  it("ships a published quality rule set flagged as provisional", () => {
    const loaded = loadBatteryCatalog();
    const version = loaded.ruleSets[0]?.versions[0];

    expect(version?.status).toBe("published");
    expect(version?.definition.provisional).toBe(true);
    expect(version?.definition.domains.gv.minViewport).not.toBeNull();
  });

  it("ships every battery item as a reviewable draft", () => {
    const loaded = loadBatteryCatalog();
    const statuses = loaded.banks.flatMap((bank) =>
      bank.items.flatMap((item) =>
        item.revisions.map((revision) => revision.status),
      ),
    );

    expect(statuses.every((status) => status === "draft")).toBe(true);
  });
});
