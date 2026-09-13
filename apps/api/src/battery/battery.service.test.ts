import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import {
  battery,
  batteryResponse,
  batteryScore,
  batteryVersion,
  type Database,
  item,
  itemInstance,
  itemRevision,
  qualityEvent,
  qualityRuleSet,
  qualityRuleVersion,
  schema,
  sectionInstance,
  sectionScore,
  subtestForm,
  subtestFormVersion,
  user,
} from "@mindmetric/db";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { BatteryService } from "./battery.service";

/**
 * The runner is exercised against purpose-built forms rather than the shipped
 * catalog: the behaviour under test is administration, which must not break
 * when an item is re-authored. The real documents are validated in
 * `packages/catalog`.
 */
const GF_SAMPLES = ["gf_s1_r1", "gf_s2_r1"];
const GF_SCORED = ["gf_i1_r1", "gf_i2_r1", "gf_i3_r1"];
const GV_SCORED = ["gv_i1_r1", "gv_i2_r1"];

const SECTION_LIMIT_MS = 300_000;
const GS_SAMPLE = "gs_s1_r1";
const GS_SCORED = "gs_t1_r1";
const GS_TRIAL_MS = 90_000;
const WM_SAMPLE = "wm_s1_r1";
const WM_SCORED = ["wm_t1_r1", "wm_t2_r1", "wm_t3_r1"] as const;
const WM_SCORED_LENGTHS = [3, 3, 4] as const;

let db: Database;
let service: BatteryService;

function textItem(domain: "gf" | "gv", revisionId: string) {
  return {
    engine: "power-mcq-v1",
    domain,
    prompt: `Pick the odd one out (${revisionId}).`,
    stimulus: { type: "text", text: `stimulus ${revisionId}` },
    choices: [
      { id: "a", content: { type: "text", text: "alpha" } },
      { id: "b", content: { type: "text", text: "beta" } },
      { id: "c", content: { type: "text", text: "gamma" } },
      { id: "d", content: { type: "text", text: "delta" } },
    ],
    correctChoiceId: "a",
    difficulty: "moderate",
    anchor: false,
  };
}

async function seedItems(now: Date) {
  const all: Array<{ id: string; domain: "gf" | "gv" }> = [
    ...GF_SAMPLES.map((id) => ({ id, domain: "gf" as const })),
    ...GF_SCORED.map((id) => ({ id, domain: "gf" as const })),
    ...GV_SCORED.map((id) => ({ id, domain: "gv" as const })),
  ];

  await db.insert(item).values(
    all.map((entry) => ({
      id: `${entry.id}_item`,
      bankId: "bank_test",
      domain: entry.domain,
      engine: "power-mcq-v1",
      createdAt: now,
      updatedAt: now,
    })),
  );

  await db.insert(itemRevision).values(
    all.map((entry) => ({
      id: entry.id,
      itemId: `${entry.id}_item`,
      revision: 1,
      status: "published",
      content: textItem(entry.domain, entry.id),
      publishedAt: now,
      createdAt: now,
    })),
  );
}

async function seedForms(now: Date) {
  await db.insert(subtestForm).values([
    {
      id: "form_gf_test",
      slug: "gf-test",
      title: "Gf test form",
      description: "Fixture",
      domain: "gf",
      engine: "power-form-v1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "form_gv_test",
      slug: "gv-test",
      title: "Gv test form",
      description: "Fixture",
      domain: "gv",
      engine: "power-form-v1",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await db.insert(subtestFormVersion).values([
    {
      id: "form_gf_test_v1",
      formId: "form_gf_test",
      version: 1,
      status: "published",
      definition: {
        engine: "power-form-v1",
        domain: "gf",
        scoringModel: "accuracy-power-v1",
        sectionTimeLimitMs: SECTION_LIMIT_MS,
        itemCeilingMs: 90_000,
        sampleItemRevisionIds: GF_SAMPLES,
        itemRevisionIds: GF_SCORED,
      },
      publishedAt: now,
      createdAt: now,
    },
    {
      id: "form_gv_test_v1",
      formId: "form_gv_test",
      version: 1,
      status: "published",
      definition: {
        engine: "power-form-v1",
        domain: "gv",
        scoringModel: "accuracy-power-v1",
        sectionTimeLimitMs: 120_000,
        itemCeilingMs: 30_000,
        sampleItemRevisionIds: [],
        itemRevisionIds: GV_SCORED,
      },
      publishedAt: now,
      createdAt: now,
    },
  ]);
}

async function seedBatteries(now: Date) {
  await db.insert(battery).values([
    {
      id: "bat_live",
      slug: "live-battery",
      title: "Live battery",
      description: "Fixture",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "bat_draft",
      slug: "draft-battery",
      title: "Draft battery",
      description: "Fixture",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await db.insert(batteryVersion).values([
    {
      id: "bat_live_v1",
      batteryId: "bat_live",
      version: 1,
      status: "published",
      definition: {
        engine: "battery-v1",
        sections: [
          { position: 1, domain: "gf", formVersionId: "form_gf_test_v1" },
          { position: 2, domain: "gv", formVersionId: "form_gv_test_v1" },
        ],
      },
      publishedAt: now,
      createdAt: now,
    },
    {
      id: "bat_draft_v1",
      batteryId: "bat_draft",
      version: 1,
      status: "draft",
      definition: {
        engine: "battery-v1",
        sections: [
          { position: 1, domain: "gf", formVersionId: "form_gf_test_v1" },
        ],
      },
      publishedAt: null,
      createdAt: now,
    },
  ]);
}

function speedFig(shape: "circle" | "square") {
  return { kind: "single", elements: [{ shape, fill: "solid" }] };
}

function speedTrial(revisionId: string, count: number) {
  return {
    engine: "speed-trial-v1",
    domain: "gs",
    prompt: "Same or different?",
    k: 2,
    decisions: Array.from({ length: count }, (_, index) => ({
      id: `${revisionId}_d${index + 1}`,
      same: index % 2 === 0,
      left: speedFig("circle"),
      right: speedFig(index % 2 === 0 ? "circle" : "square"),
    })),
  };
}

async function seedGs(now: Date) {
  await db.insert(item).values([
    {
      id: `${GS_SAMPLE}_item`,
      bankId: "bank_gs_test",
      domain: "gs",
      engine: "speed-trial-v1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${GS_SCORED}_item`,
      bankId: "bank_gs_test",
      domain: "gs",
      engine: "speed-trial-v1",
      createdAt: now,
      updatedAt: now,
    },
  ]);
  await db.insert(itemRevision).values([
    {
      id: GS_SAMPLE,
      itemId: `${GS_SAMPLE}_item`,
      revision: 1,
      status: "published",
      content: speedTrial(GS_SAMPLE, 4),
      publishedAt: now,
      createdAt: now,
    },
    {
      id: GS_SCORED,
      itemId: `${GS_SCORED}_item`,
      revision: 1,
      status: "published",
      content: speedTrial(GS_SCORED, 8),
      publishedAt: now,
      createdAt: now,
    },
  ]);
  await db.insert(subtestForm).values({
    id: "form_gs_test",
    slug: "gs-test",
    title: "Gs test form",
    description: "Fixture",
    domain: "gs",
    engine: "speed-form-v1",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(subtestFormVersion).values({
    id: "form_gs_test_v1",
    formId: "form_gs_test",
    version: 1,
    status: "published",
    definition: {
      engine: "speed-form-v1",
      domain: "gs",
      scoringModel: "speed-corrected-v1",
      trialTimeLimitMs: GS_TRIAL_MS,
      sampleItemRevisionIds: [GS_SAMPLE],
      itemRevisionIds: [GS_SCORED],
    },
    publishedAt: now,
    createdAt: now,
  });
  await db.insert(battery).values({
    id: "bat_gs",
    slug: "gs-test-battery",
    title: "Gs battery",
    description: "Fixture",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(batteryVersion).values({
    id: "bat_gs_v1",
    batteryId: "bat_gs",
    version: 1,
    status: "published",
    definition: {
      engine: "battery-v1",
      sections: [
        { position: 1, domain: "gs", formVersionId: "form_gs_test_v1" },
      ],
    },
    publishedAt: now,
    createdAt: now,
  });
}

function spanTrial(length: number) {
  return {
    engine: "span-trial-v1",
    domain: "gwm",
    procedure: "spatial-reverse-v1",
    length,
    recall: "reverse",
    grid: { rows: 3, cols: 3 },
  };
}

async function seedWm(now: Date) {
  const revisions = [
    { id: WM_SAMPLE, length: 2 },
    ...WM_SCORED.map((id, index) => ({
      id,
      length: WM_SCORED_LENGTHS[index] ?? 3,
    })),
  ];

  await db.insert(item).values(
    revisions.map((entry) => ({
      id: `${entry.id}_item`,
      bankId: "bank_wm_test",
      domain: "gwm",
      engine: "span-trial-v1",
      createdAt: now,
      updatedAt: now,
    })),
  );
  await db.insert(itemRevision).values(
    revisions.map((entry) => ({
      id: entry.id,
      itemId: `${entry.id}_item`,
      revision: 1,
      status: "published",
      content: spanTrial(entry.length),
      publishedAt: now,
      createdAt: now,
    })),
  );
  await db.insert(subtestForm).values({
    id: "form_wm_test",
    slug: "wm-test",
    title: "WM test form",
    description: "Fixture",
    domain: "gwm",
    engine: "span-form-v1",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(subtestFormVersion).values({
    id: "form_wm_test_v1",
    formId: "form_wm_test",
    version: 1,
    status: "published",
    definition: {
      engine: "span-form-v1",
      domain: "gwm",
      scoringModel: "span-partial-v1",
      sectionTimeLimitMs: SECTION_LIMIT_MS,
      stimulusMs: 200,
      isiMs: 0,
      recallCeilingMs: 20_000,
      sampleItemRevisionIds: [WM_SAMPLE],
      itemRevisionIds: [...WM_SCORED],
    },
    publishedAt: now,
    createdAt: now,
  });
  await db.insert(battery).values({
    id: "bat_wm",
    slug: "wm-test-battery",
    title: "WM battery",
    description: "Fixture",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(batteryVersion).values({
    id: "bat_wm_v1",
    batteryId: "bat_wm",
    version: 1,
    status: "published",
    definition: {
      engine: "battery-v1",
      sections: [
        { position: 1, domain: "gwm", formVersionId: "form_wm_test_v1" },
      ],
    },
    publishedAt: now,
    createdAt: now,
  });
}

async function seedComposed(now: Date) {
  await db.insert(battery).values({
    id: "bat_composed",
    slug: "composed-test-battery",
    title: "Composed battery",
    description: "Fixture",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(batteryVersion).values({
    id: "bat_composed_v1",
    batteryId: "bat_composed",
    version: 1,
    status: "published",
    definition: {
      engine: "battery-v1",
      sections: [
        {
          position: 1,
          domain: "gf",
          formVersionId: "form_gf_test_v1",
          breakAfter: true,
          breakMaxMs: 15_000,
        },
        { position: 2, domain: "gs", formVersionId: "form_gs_test_v1" },
        { position: 3, domain: "gwm", formVersionId: "form_wm_test_v1" },
      ],
    },
    publishedAt: now,
    createdAt: now,
  });
}

async function seedRules(now: Date) {
  const open = { minViewport: null, normIneligibleDeviceClasses: [] };
  await db.insert(qualityRuleSet).values({
    id: "qrs_test",
    slug: "test-rules",
    title: "Test rules",
    description: "Fixture",
    engine: "quality-rules-v1",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(qualityRuleVersion).values({
    id: "qrs_test_v1",
    ruleSetId: "qrs_test",
    version: 1,
    status: "published",
    definition: {
      engine: "quality-rules-v1",
      provisional: true,
      normReferenceDeviceClass: "desktop",
      domains: {
        gf: open,
        gs: open,
        rq: open,
        gwm: open,
        gv: {
          minViewport: { widthPx: 820, heightPx: 640 },
          normIneligibleDeviceClasses: ["phone", "unknown"],
        },
      },
      severity: {
        viewport_below_minimum: {
          default: "info",
          byDomain: { gv: "invalidating" },
        },
        device_class_not_normed: {
          default: "info",
          byDomain: { gv: "invalidating" },
        },
      },
    },
    publishedAt: now,
    createdAt: now,
  });
}

/** Each test gets its own examinee so attempt counters stay independent. */
async function freshUser() {
  const id = `user_${randomUUID()}`;
  const now = new Date();
  await db.insert(user).values({
    id,
    name: "Test",
    email: `${id}@example.com`,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

type Covariates = {
  deviceClass?: string;
  inputMode?: string;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
};

function startSession(
  userId: string,
  slug = "live-battery",
  covariates: Covariates = {},
) {
  return service.start(userId, {
    batterySlug: slug,
    deviceClass: covariates.deviceClass ?? "desktop",
    inputMode: covariates.inputMode ?? "mouse",
    viewportWidth:
      covariates.viewportWidth === undefined ? 1440 : covariates.viewportWidth,
    viewportHeight:
      covariates.viewportHeight === undefined ? 900 : covariates.viewportHeight,
    locale: "en",
  });
}

type ServedItem = {
  itemInstanceId: string;
  choices?: Array<{ id: string } | string>;
};

function firstChoiceId(item: ServedItem) {
  const choice = item.choices?.[0];
  return typeof choice === "string" ? choice : (choice?.id ?? null);
}

function respond(userId: string, sessionId: string, item: ServedItem) {
  return service.submitResponse(userId, sessionId, {
    itemInstanceId: item.itemInstanceId,
    choiceId: firstChoiceId(item),
    clientShownAt: null,
    clientFirstInteractionAt: null,
    clientAnsweredAt: null,
  });
}

/** Serves the next item and answers it with the first option offered. */
async function answerNext(userId: string, sessionId: string) {
  const served = await service.serveNextItem(userId, sessionId);
  const current = served.current?.item;
  return current ? respond(userId, sessionId, current) : served;
}

async function finishSection(
  userId: string,
  sessionId: string,
  position: number,
) {
  await service.startSection(userId, sessionId, position);
  let latest = await service.getForUser(userId, sessionId);
  for (let index = 0; index < 20; index += 1) {
    const section = latest.sections.find((row) => row.position === position);
    if (section && section.status !== "in_progress") {
      break;
    }
    latest = await answerNext(userId, sessionId);
  }
  return latest;
}

async function sectionIdFor(sessionId: string, position: number) {
  const rows = await db
    .select({ id: schema.sectionInstance.id })
    .from(schema.sectionInstance)
    .where(eq(schema.sectionInstance.sessionId, sessionId))
    .orderBy(asc(schema.sectionInstance.position));
  return rows[position - 1]?.id ?? "";
}

beforeAll(async () => {
  db = drizzle({ client: new PGlite(), schema });
  await migrate(db, {
    migrationsFolder: join(process.cwd(), "../../packages/db/drizzle"),
  });
  const now = new Date();
  await seedItems(now);
  await seedForms(now);
  await seedBatteries(now);
  await seedGs(now);
  await seedWm(now);
  await seedComposed(now);
  await seedRules(now);
  service = new BatteryService(db);
}, 120_000);

describe("battery session start", () => {
  it("lays out every section up front", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);

    expect(state.status).toBe("in_progress");
    expect(state.attemptNumber).toBe(1);
    expect(state.isPracticeMode).toBe(false);
    expect(state.administrationContext).toBe("battery");
    expect(state.sections.map((row) => [row.position, row.domain])).toEqual([
      [1, "gf"],
      [2, "gv"],
    ]);
    expect(state.sections.every((row) => row.status === "pending")).toBe(true);
    expect(state.current).toBeNull();
    expect(state.report).toBeNull();
    expect(state.serverTime).toBeInstanceOf(Date);
    // Planned counts come from the form, not from item rows that do not
    // exist until the section starts.
    expect(state.sections[0]).toMatchObject({
      scoredItemCount: GF_SCORED.length,
      sampleItemCount: GF_SAMPLES.length,
      sectionTimeLimitMs: SECTION_LIMIT_MS,
    });
    expect(state.sections[1]).toMatchObject({
      scoredItemCount: GV_SCORED.length,
      sampleItemCount: 0,
    });
  });

  it("returns the session when asked for an item and no section is running", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    const next = await service.serveNextItem(userId, state.id);

    expect(next.id).toBe(state.id);
    expect(next.current).toBeNull();
    expect(next.status).toBe("in_progress");
  });

  it("administers a draft composition as practice only", async () => {
    const userId = await freshUser();
    const state = await startSession(userId, "draft-battery");

    // A pre-release trial must never claim to be a real attempt.
    expect(state.isPracticeMode).toBe(true);
    expect(state.administrationContext).toBe("practice");
  });

  it("resumes the open session instead of starting a second one", async () => {
    const userId = await freshUser();
    const first = await startSession(userId);
    const second = await startSession(userId);

    expect(second.id).toBe(first.id);
    expect(second.attemptNumber).toBe(1);
  });

  it("rejects an unsupported device class", async () => {
    const userId = await freshUser();
    await expect(
      startSession(userId, "live-battery", { deviceClass: "smart-fridge" }),
    ).rejects.toThrow(/device or input mode/);
  });

  it("reports an unknown battery rather than inventing one", async () => {
    const userId = await freshUser();
    await expect(startSession(userId, "no-such-battery")).rejects.toThrow(
      /not found/i,
    );
  });

  it("refuses to read another examinee's session", async () => {
    const userId = await freshUser();
    const other = await freshUser();
    const state = await startSession(userId);

    await expect(service.getForUser(other, state.id)).rejects.toThrow(
      /not found/i,
    );
  });
});

describe("battery overview", () => {
  it("describes the clock and device demands before anyone starts", async () => {
    const overview = await service.getOverview("live-battery");

    expect(overview.title).toBe("Live battery");
    expect(overview.practiceOnly).toBe(false);
    expect(overview.rulesProvisional).toBe(true);
    expect(overview.normReferenceDeviceClass).toBe("desktop");
    // Timed total is the sum of the section clocks, not wall-clock duration:
    // instructions and samples run untimed on top of it.
    expect(overview.timedMs).toBe(SECTION_LIMIT_MS + 120_000);
    expect(overview.sections).toHaveLength(2);
    expect(overview.sections[0]).toMatchObject({
      position: 1,
      domain: "gf",
      scoredItemCount: GF_SCORED.length,
      sampleItemCount: GF_SAMPLES.length,
      minViewport: null,
    });
    expect(overview.sections[1]?.minViewport).toEqual({
      widthPx: 820,
      heightPx: 640,
    });
    expect(overview.sections[1]?.normIneligibleDeviceClasses).toEqual([
      "phone",
      "unknown",
    ]);
  });

  it("marks a draft composition as practice only", async () => {
    const overview = await service.getOverview("draft-battery");
    expect(overview.practiceOnly).toBe(true);
  });

  it("reports an unknown battery rather than inventing one", async () => {
    await expect(service.getOverview("no-such-battery")).rejects.toThrow(
      /not found/i,
    );
  });
});

describe("section administration", () => {
  it("refuses to start a section out of order", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);

    await expect(service.startSection(userId, state.id, 2)).rejects.toThrow(
      /in order/,
    );
  });

  it("serves samples untimed and starts the clock on the first scored item", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    const started = await service.startSection(userId, state.id, 1);
    // Samples teach the format, so the section clock is not running yet.
    expect(started.sections[0]?.deadlineAt).toBeNull();

    const firstSample = await service.serveNextItem(userId, state.id);
    expect(firstSample.current?.item?.role).toBe("sample");
    expect(firstSample.current?.deadlineAt).toBeNull();
    await answerNext(userId, state.id);

    const secondSample = await service.serveNextItem(userId, state.id);
    expect(secondSample.current?.item?.role).toBe("sample");
    await answerNext(userId, state.id);

    const firstScored = await service.serveNextItem(userId, state.id);
    expect(firstScored.current?.item?.role).toBe("scored");

    const deadline = firstScored.current?.deadlineAt;
    expect(deadline).not.toBeNull();
    // The whole section limit is still ahead of the first scored item.
    const remaining = (deadline?.getTime() ?? 0) - Date.now();
    expect(remaining).toBeGreaterThan(SECTION_LIMIT_MS - 10_000);
  });

  it("moves to the next section only after the previous one closes", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    const afterFirst = await finishSection(userId, state.id, 1);

    expect(afterFirst.sections[0]?.status).toBe("submitted");
    expect(afterFirst.status).toBe("in_progress");
    expect(afterFirst.current).toBeNull();

    const second = await service.startSection(userId, state.id, 2);
    expect(second.sections[1]?.status).toBe("in_progress");
    // Gv has no samples, so its first served item is scored.
    const served = await service.serveNextItem(userId, state.id);
    expect(served.current?.domain).toBe("gv");
    expect(served.current?.item?.role).toBe("scored");
  });

  it("closes the session once the last section is finished", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await finishSection(userId, state.id, 1);
    const done = await finishSection(userId, state.id, 2);

    expect(done.status).toBe("completed");
    expect(done.completedAt).not.toBeNull();
    expect(done.sections.map((row) => row.status)).toEqual([
      "submitted",
      "submitted",
    ]);
    expect(done.sections[0]?.scoredItemCount).toBe(GF_SCORED.length);
    expect(done.sections[0]?.completedItemCount).toBe(GF_SCORED.length);
    expect(done.current).toBeNull();
  });

  it("counts a finished attempt so the next session is attempt two", async () => {
    const userId = await freshUser();
    const first = await startSession(userId);
    await finishSection(userId, first.id, 1);
    await finishSection(userId, first.id, 2);

    const second = await startSession(userId);
    expect(second.id).not.toBe(first.id);
    expect(second.attemptNumber).toBe(2);
  });
});

describe("norm eligibility", () => {
  it("keeps a full-size desktop section in the norming sample", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    const started = await service.startSection(userId, state.id, 1);
    const section = started.sections[0];

    expect(section?.ruleVersionId).toBe("qrs_test_v1");
    expect(section?.observations).toEqual([]);
    expect(section?.normEligible).toBe(true);
  });

  it("runs a Gv section on a phone but keeps it out of the norms", async () => {
    const userId = await freshUser();
    const state = await startSession(userId, "live-battery", {
      deviceClass: "phone",
      inputMode: "touch",
      viewportWidth: 390,
      viewportHeight: 700,
    });
    // Judged at session start so the intro can warn before anyone begins.
    expect(state.sections[1]?.normEligible).toBe(false);
    expect(state.sections[0]?.normEligible).toBe(true);

    await finishSection(userId, state.id, 1);
    const started = await service.startSection(userId, state.id, 2);
    const gv = started.sections[1];

    expect(gv?.status).toBe("in_progress");
    expect(gv?.normEligible).toBe(false);
    const observations = (gv?.observations ?? []) as Array<{
      flag: string;
      severity: string;
      measured: string;
    }>;
    expect(observations.map((row) => row.flag).sort()).toEqual([
      "device_class_not_normed",
      "viewport_below_minimum",
    ]);
    expect(observations.every((row) => row.severity === "invalidating")).toBe(
      true,
    );

    // Gf places no demand on screen size, so the same device stays eligible.
    expect(started.sections[0]?.normEligible).toBe(true);

    // The examinee still gets the section.
    const served = await service.serveNextItem(userId, state.id);
    expect(served.current?.item).toBeTruthy();
  });

  it("never lets practice feed the norms", async () => {
    const userId = await freshUser();
    const state = await startSession(userId, "draft-battery");
    const started = await service.startSection(userId, state.id, 1);

    expect(started.sections[0]?.observations).toEqual([]);
    expect(started.sections[0]?.normEligible).toBe(false);
  });
});

describe("item presentation and responses", () => {
  it("never sends the answer key to the client", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await service.startSection(userId, state.id, 1);
    const served = await service.serveNextItem(userId, state.id);

    const current = served.current?.item;
    expect(current).toBeTruthy();
    expect(JSON.stringify(current)).not.toContain("correctChoiceId");
    expect(current && "choices" in current ? current.choices : []).toHaveLength(
      4,
    );
  });

  it("returns the in-flight item on resume without restarting its clock", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await service.startSection(userId, state.id, 1);
    const served = await service.serveNextItem(userId, state.id);

    const resumed = await service.serveNextItem(userId, state.id);
    expect(resumed.current?.item?.itemInstanceId).toBe(
      served.current?.item?.itemInstanceId,
    );
    expect(resumed.current?.item?.shownAt).toEqual(
      served.current?.item?.shownAt,
    );
  });

  it("locks an item once it is answered", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await service.startSection(userId, state.id, 1);
    const served = await service.serveNextItem(userId, state.id);
    const current = served.current?.item;
    if (!current) {
      throw new Error("Expected an item to be served.");
    }

    await respond(userId, state.id, current);
    const next = await service.serveNextItem(userId, state.id);
    expect(next.current?.item?.itemInstanceId).not.toBe(current.itemInstanceId);

    // Forward-only: with the next item on screen, the answered one is closed.
    await expect(respond(userId, state.id, current)).rejects.toThrow(
      /no longer open/,
    );
  });

  it("rejects an option that was not offered", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await service.startSection(userId, state.id, 1);
    const served = await service.serveNextItem(userId, state.id);

    await expect(
      service.submitResponse(userId, state.id, {
        itemInstanceId: served.current?.item?.itemInstanceId ?? "",
        choiceId: "not-an-option",
        clientShownAt: null,
        clientFirstInteractionAt: null,
        clientAnsweredAt: null,
      }),
    ).rejects.toThrow(/not offered/);
  });

  it("records an omission, which is how a skip is stored", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await service.startSection(userId, state.id, 1);
    const served = await service.serveNextItem(userId, state.id);
    const itemInstanceId = served.current?.item?.itemInstanceId ?? "";

    const after = await service.submitResponse(userId, state.id, {
      itemInstanceId,
      choiceId: null,
      clientShownAt: null,
      clientFirstInteractionAt: null,
      clientAnsweredAt: null,
    });
    expect(after.current?.item).toBeNull();

    const rows = await db
      .select()
      .from(batteryResponse)
      .where(eq(batteryResponse.itemInstanceId, itemInstanceId));
    expect(rows[0]?.code).toBe("omitted");
    expect(rows[0]?.choiceId).toBeNull();
  });

  it("refuses a response when no item is on screen", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await service.startSection(userId, state.id, 1);

    await expect(
      service.submitResponse(userId, state.id, {
        itemInstanceId: "whatever",
        choiceId: null,
        clientShownAt: null,
        clientFirstInteractionAt: null,
        clientAnsweredAt: null,
      }),
    ).rejects.toThrow(/waiting for an answer/);
  });

  it("keeps the client clocks it was given without trusting them", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await service.startSection(userId, state.id, 1);
    const served = await service.serveNextItem(userId, state.id);
    const itemInstanceId = served.current?.item?.itemInstanceId ?? "";

    const clientShownAt = new Date("2020-01-01T00:00:00.000Z");
    await service.submitResponse(userId, state.id, {
      itemInstanceId,
      choiceId: "a",
      clientShownAt,
      clientFirstInteractionAt: null,
      clientAnsweredAt: null,
    });

    const rows = await db
      .select()
      .from(batteryResponse)
      .where(eq(batteryResponse.itemInstanceId, itemInstanceId));
    // Stored for later comparison, but the scored time comes from the server.
    expect(rows[0]?.clientShownAt).toEqual(clientShownAt);
    expect(rows[0]?.responseTimeMs).toBeLessThan(60_000);
    expect(rows[0]?.serverReceivedAt.getTime()).toBeGreaterThan(
      clientShownAt.getTime(),
    );
  });
});

describe("expiry", () => {
  it("separates reached-but-unanswered items from items never presented", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await service.startSection(userId, state.id, 1);

    // Clear both samples so a scored item starts the section clock.
    await answerNext(userId, state.id);
    await answerNext(userId, state.id);
    const scored = await service.serveNextItem(userId, state.id);
    const shownId = scored.current?.item?.itemInstanceId ?? "";
    expect(scored.current?.item?.role).toBe("scored");

    const sectionId = await sectionIdFor(state.id, 1);
    await db
      .update(schema.sectionInstance)
      .set({ deadlineAt: new Date(Date.now() - 60_000) })
      .where(eq(schema.sectionInstance.id, sectionId));

    const closed = await service.getForUser(userId, state.id);
    expect(closed.sections[0]?.status).toBe("expired");
    // A later section is still ahead, so the session stays open.
    expect(closed.status).toBe("in_progress");
    expect(closed.current).toBeNull();

    const instances = await db
      .select()
      .from(itemInstance)
      .where(eq(itemInstance.sectionInstanceId, sectionId))
      .orderBy(asc(itemInstance.position));

    const shown = instances.find((row) => row.id === shownId);
    // Reached but unanswered when the clock stopped.
    expect(shown?.status).toBe("timed_out");
    // The other two scored items were never presented.
    expect(
      instances.filter((row) => row.status === "not_reached"),
    ).toHaveLength(2);

    const timedOut = await db
      .select()
      .from(batteryResponse)
      .where(eq(batteryResponse.itemInstanceId, shownId));
    expect(timedOut[0]?.code).toBe("timed_out");
    expect(timedOut[0]?.choiceId).toBeNull();

    const events = await db
      .select()
      .from(qualityEvent)
      .where(eq(qualityEvent.sectionInstanceId, sectionId));
    expect(events.map((row) => row.kind)).toContain("section_expired");
  });

  it("records a late answer as post-deadline rather than discarding it", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await service.startSection(userId, state.id, 1);
    await answerNext(userId, state.id);
    await answerNext(userId, state.id);

    const scored = await service.serveNextItem(userId, state.id);
    const current = scored.current?.item;
    if (!current) {
      throw new Error("Expected a scored item to be served.");
    }

    await db
      .update(schema.sectionInstance)
      .set({ deadlineAt: new Date(Date.now() - 60_000) })
      .where(eq(schema.sectionInstance.id, await sectionIdFor(state.id, 1)));

    await respond(userId, state.id, current);

    const rows = await db
      .select()
      .from(batteryResponse)
      .where(eq(batteryResponse.itemInstanceId, current.itemInstanceId));
    // The keystroke happened, so it is kept with an honest code; scoring
    // decides what a post-deadline answer is worth (ADR 0016).
    expect(rows[0]?.code).toBe("post_deadline");
    expect(rows[0]?.choiceId).toBe(firstChoiceId(current));
  });
});

describe("quality events", () => {
  it("accepts a client event and refuses a server-only kind", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);

    // A client may not claim an event the server is responsible for writing.
    await expect(
      service.logQualityEvent(userId, state.id, {
        kind: "section_expired",
        occurredAt: null,
        payload: null,
      }),
    ).rejects.toThrow(/Unknown quality event/);

    const result = await service.logQualityEvent(userId, state.id, {
      kind: "visibility_hidden",
      occurredAt: new Date(),
      payload: { reason: "tab switch" },
    });
    expect(result.recorded).toBe(true);
  });

  it("attributes an event to the running section", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await service.startSection(userId, state.id, 1);

    await service.logQualityEvent(userId, state.id, {
      kind: "focus_lost",
      occurredAt: new Date(),
      payload: null,
    });

    const rows = await db
      .select()
      .from(qualityEvent)
      .where(eq(qualityEvent.sessionId, state.id));
    const event = rows.find((row) => row.kind === "focus_lost");
    expect(event?.sectionInstanceId).toBe(await sectionIdFor(state.id, 1));
  });

  it("clamps an event timestamp that predates the session", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);

    await service.logQualityEvent(userId, state.id, {
      kind: "focus_lost",
      occurredAt: new Date("2000-01-01T00:00:00.000Z"),
      payload: null,
    });

    const rows = await db
      .select()
      .from(qualityEvent)
      .where(eq(qualityEvent.sessionId, state.id));
    const event = rows.find((row) => row.kind === "focus_lost");
    expect(event?.occurredAt.getTime()).toBeGreaterThanOrEqual(
      state.startedAt.getTime(),
    );
  });
});

/** The key is always `a` in the fixture bank; presentation still offers it. */
async function answerKeyed(userId: string, sessionId: string) {
  const served = await service.serveNextItem(userId, sessionId);
  const current = served.current?.item;
  if (!current) {
    return served;
  }
  return service.submitResponse(userId, sessionId, {
    itemInstanceId: current.itemInstanceId,
    choiceId: current.role === "sample" ? firstChoiceId(current) : "a",
    clientShownAt: null,
    clientFirstInteractionAt: null,
    clientAnsweredAt: null,
  });
}

async function finishSectionKeyed(
  userId: string,
  sessionId: string,
  position: number,
) {
  await service.startSection(userId, sessionId, position);
  let latest = await service.getForUser(userId, sessionId);
  for (let index = 0; index < 20; index += 1) {
    const section = latest.sections.find((row) => row.position === position);
    if (section && section.status !== "in_progress") {
      break;
    }
    latest = await answerKeyed(userId, sessionId);
  }
  return latest;
}

describe("raw scoring", () => {
  it("does not serialize a section total while the session is still open", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    const afterFirst = await finishSection(userId, state.id, 1);

    expect(afterFirst.status).toBe("in_progress");
    expect(afterFirst.report).toBeNull();

    const rows = await db
      .select()
      .from(sectionScore)
      .where(
        eq(sectionScore.sectionInstanceId, await sectionIdFor(state.id, 1)),
      );
    // The snapshot exists so a later report does not have to re-score.
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(afterFirst)).not.toContain('"raw"');
  });

  it("reports raw / max after the battery closes, and never an IQ", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await finishSectionKeyed(userId, state.id, 1);
    const done = await finishSectionKeyed(userId, state.id, 2);

    expect(done.status).toBe("completed");
    expect(done.report?.maturity).toBe("S0");
    expect(done.report?.estimatedIq).toBeNull();
    expect(done.report?.percentile).toBeNull();
    expect(done.report?.interval).toBeNull();
    expect(done.report?.composite).toBeNull();
    expect(done.report?.sections).toEqual([
      expect.objectContaining({
        domain: "gf",
        raw: GF_SCORED.length,
        max: GF_SCORED.length,
        attempted: GF_SCORED.length,
      }),
      expect.objectContaining({
        domain: "gv",
        raw: GV_SCORED.length,
        max: GV_SCORED.length,
      }),
    ]);
    expect(JSON.stringify(done.report)).not.toContain("correctChoiceId");
    expect(JSON.stringify(done.report)).not.toContain("items");

    const snapshots = await db
      .select()
      .from(batteryScore)
      .where(eq(batteryScore.sessionId, state.id));
    expect(snapshots).toHaveLength(1);
  });

  it("counts samples out of the raw total", async () => {
    const userId = await freshUser();
    const state = await startSession(userId);
    await finishSectionKeyed(userId, state.id, 1);
    const done = await finishSectionKeyed(userId, state.id, 2);
    const gf = done.report?.sections.find((section) => section.domain === "gf");

    // Two samples plus three scored items were answered; only the three count.
    expect(gf?.max).toBe(GF_SCORED.length);
    expect(gf?.max).not.toBe(GF_SAMPLES.length + GF_SCORED.length);
  });

  it("carries completion quality onto the finished report", async () => {
    const userId = await freshUser();
    const state = await startSession(userId, "live-battery", {
      deviceClass: "phone",
      inputMode: "touch",
      viewportWidth: 390,
      viewportHeight: 700,
    });

    await service.startSection(userId, state.id, 1);
    await answerNext(userId, state.id);
    await answerNext(userId, state.id);
    await service.serveNextItem(userId, state.id);
    await db
      .update(schema.sectionInstance)
      .set({ deadlineAt: new Date(Date.now() - 60_000) })
      .where(eq(schema.sectionInstance.id, await sectionIdFor(state.id, 1)));
    await service.getForUser(userId, state.id);

    const done = await finishSectionKeyed(userId, state.id, 2);
    const gf = done.report?.sections.find((section) => section.domain === "gf");
    const gv = done.report?.sections.find((section) => section.domain === "gv");

    expect(gf?.status).toBe("expired");
    expect(gf?.notReached).toBe(2);
    expect(gf?.timedOut).toBe(1);
    expect(gf?.normEligible).toBe(true);
    expect(gv?.normEligible).toBe(false);
    expect(gv?.observations?.map((row) => row.flag).sort()).toEqual([
      "device_class_not_normed",
      "viewport_below_minimum",
    ]);
  });
});

describe("session list", () => {
  it("returns only the examinee's sessions, with totals only when complete", async () => {
    const userId = await freshUser();
    const other = await freshUser();
    const open = await startSession(userId);
    await startSession(other);

    const listed = await service.listForUser(userId);
    expect(listed.map((row) => row.id)).toEqual([open.id]);
    expect(listed[0]?.report).toBeNull();

    await finishSectionKeyed(userId, open.id, 1);
    await finishSectionKeyed(userId, open.id, 2);

    const finished = await service.listForUser(userId);
    expect(finished[0]?.status).toBe("completed");
    expect(finished[0]?.report?.sections[0]?.max).toBe(GF_SCORED.length);
    expect(finished[0]?.report?.estimatedIq).toBeNull();
    expect(await service.listForUser(other)).toHaveLength(1);
    expect((await service.listForUser(other))[0]?.id).not.toBe(open.id);
  });
});

describe("gs speed trials", () => {
  function keyedDecisions(item: { decisions: Array<{ id: string }> }) {
    return item.decisions.map((decision, index) => ({
      decisionId: decision.id,
      choiceId: index % 2 === 0 ? "same" : "different",
    }));
  }

  it("keeps the key off the served trial and scores a keyed batch", async () => {
    const userId = await freshUser();
    const state = await startSession(userId, "gs-test-battery");
    const overview = await service.getOverview("gs-test-battery");

    expect(overview.timedMs).toBe(GS_TRIAL_MS);
    expect(overview.sections[0]?.itemCeilingMs).toBe(GS_TRIAL_MS);

    await service.startSection(userId, state.id, 1);
    const sample = await service.serveNextItem(userId, state.id);
    const sampleItem = sample.current?.item;
    expect(
      sampleItem && "engine" in sampleItem ? sampleItem.engine : null,
    ).toBe("speed-trial-v1");
    expect(JSON.stringify(sampleItem)).not.toContain('"same":true');
    expect(JSON.stringify(sampleItem)).not.toContain('"same":false');

    if (!sampleItem || !("decisions" in sampleItem)) {
      throw new Error("expected a sample trial");
    }
    await service.submitResponse(userId, state.id, {
      itemInstanceId: sampleItem.itemInstanceId,
      choiceId: null,
      decisions: keyedDecisions(sampleItem),
      clientShownAt: null,
      clientFirstInteractionAt: null,
      clientAnsweredAt: null,
    });

    const scored = await service.serveNextItem(userId, state.id);
    const trial = scored.current?.item;
    if (!trial || !("decisions" in trial)) {
      throw new Error("expected a scored trial");
    }
    const done = await service.submitResponse(userId, state.id, {
      itemInstanceId: trial.itemInstanceId,
      choiceId: null,
      decisions: keyedDecisions(trial),
      clientShownAt: null,
      clientFirstInteractionAt: null,
      clientAnsweredAt: null,
    });

    expect(done.status).toBe("completed");
    expect(done.report?.sections[0]).toMatchObject({
      domain: "gs",
      scoringModel: "speed-corrected-v1",
      raw: 8,
      max: 8,
      attempted: 8,
      accuracyOnAttempted: null,
    });
  });

  it("does not treat a late batch as correct answers", async () => {
    const userId = await freshUser();
    const state = await startSession(userId, "gs-test-battery");
    await service.startSection(userId, state.id, 1);
    const sample = await service.serveNextItem(userId, state.id);
    const sampleItem = sample.current?.item;
    if (!sampleItem || !("decisions" in sampleItem)) {
      throw new Error("expected a sample trial");
    }
    await service.submitResponse(userId, state.id, {
      itemInstanceId: sampleItem.itemInstanceId,
      choiceId: null,
      decisions: keyedDecisions(sampleItem),
      clientShownAt: null,
      clientFirstInteractionAt: null,
      clientAnsweredAt: null,
    });

    const served = await service.serveNextItem(userId, state.id);
    const trial = served.current?.item;
    if (!trial || !("decisions" in trial) || !trial.shownAt) {
      throw new Error("expected a scored trial");
    }
    await db
      .update(schema.itemInstance)
      .set({
        shownAt: new Date(Date.now() - GS_TRIAL_MS - 5_000),
      })
      .where(eq(schema.itemInstance.id, trial.itemInstanceId));

    const done = await service.submitResponse(userId, state.id, {
      itemInstanceId: trial.itemInstanceId,
      choiceId: null,
      decisions: keyedDecisions(trial),
      clientShownAt: null,
      clientFirstInteractionAt: null,
      clientAnsweredAt: null,
    });

    expect(done.status).toBe("completed");
    expect(done.report?.sections[0]?.raw).toBe(0);
    expect(done.report?.sections[0]?.timedOut).toBe(8);
  });
});

describe("wm span trials", () => {
  function reverseRecall(item: { sequence: string[] }) {
    return [...item.sequence].reverse();
  }

  async function submitRecall(
    userId: string,
    sessionId: string,
    item: { itemInstanceId: string },
    recalled: string[],
  ) {
    return service.submitResponse(userId, sessionId, {
      itemInstanceId: item.itemInstanceId,
      choiceId: null,
      recalled,
      clientShownAt: null,
      clientFirstInteractionAt: null,
      clientAnsweredAt: null,
    });
  }

  it("generates a sequence, keeps a labeled key off the trial, and scores reverse recall", async () => {
    const userId = await freshUser();
    const state = await startSession(userId, "wm-test-battery");
    const overview = await service.getOverview("wm-test-battery");

    expect(overview.sections[0]?.itemCeilingMs).toBe(20_000);

    await service.startSection(userId, state.id, 1);
    const sample = await service.serveNextItem(userId, state.id);
    const sampleItem = sample.current?.item;
    expect(
      sampleItem && "engine" in sampleItem ? sampleItem.engine : null,
    ).toBe("span-trial-v1");
    expect(JSON.stringify(sampleItem)).not.toContain('"target"');
    expect(JSON.stringify(sampleItem)).not.toContain('"key"');

    if (!sampleItem || !("sequence" in sampleItem)) {
      throw new Error("expected a sample span trial");
    }
    expect(sampleItem.sequence).toHaveLength(2);
    expect(sample.current?.itemCeilingMs).toBe(20_400);

    await submitRecall(userId, state.id, sampleItem, reverseRecall(sampleItem));

    let raw = 0;
    for (const length of WM_SCORED_LENGTHS) {
      const served = await service.serveNextItem(userId, state.id);
      const trial = served.current?.item;
      if (!trial || !("sequence" in trial)) {
        throw new Error("expected a scored span trial");
      }
      expect(trial.sequence).toHaveLength(length);
      raw += length;
      const done = await submitRecall(
        userId,
        state.id,
        trial,
        reverseRecall(trial),
      );
      if (length === WM_SCORED_LENGTHS[WM_SCORED_LENGTHS.length - 1]) {
        expect(done.status).toBe("completed");
        expect(done.report?.sections[0]).toMatchObject({
          domain: "gwm",
          scoringModel: "span-partial-v1",
          raw,
          max: 3 + 3 + 4,
          attempted: 3,
          notReached: 0,
        });
      }
    }
  });

  it("discontinues after two consecutive zero-credit scored trials", async () => {
    const userId = await freshUser();
    const state = await startSession(userId, "wm-test-battery");
    await service.startSection(userId, state.id, 1);

    const sample = await service.serveNextItem(userId, state.id);
    const sampleItem = sample.current?.item;
    if (!sampleItem || !("sequence" in sampleItem)) {
      throw new Error("expected a sample span trial");
    }
    await submitRecall(userId, state.id, sampleItem, []);

    const first = await service.serveNextItem(userId, state.id);
    const firstItem = first.current?.item;
    if (!firstItem || !("sequence" in firstItem)) {
      throw new Error("expected the first scored trial");
    }
    await submitRecall(userId, state.id, firstItem, []);

    const second = await service.serveNextItem(userId, state.id);
    const secondItem = second.current?.item;
    if (!secondItem || !("sequence" in secondItem)) {
      throw new Error("expected the second scored trial");
    }
    const done = await submitRecall(userId, state.id, secondItem, []);

    expect(done.status).toBe("completed");
    expect(done.report?.sections[0]).toMatchObject({
      domain: "gwm",
      raw: 0,
      max: 10,
      attempted: 2,
      notReached: 1,
    });

    const sections = await db
      .select({ id: sectionInstance.id })
      .from(sectionInstance)
      .where(eq(sectionInstance.sessionId, state.id));
    const leftover = await db
      .select({ status: itemInstance.status, role: itemInstance.role })
      .from(itemInstance)
      .where(eq(itemInstance.sectionInstanceId, sections[0]?.id ?? ""))
      .orderBy(asc(itemInstance.position));
    expect(
      leftover.filter((row) => row.role === "scored").map((row) => row.status),
    ).toEqual(["omitted", "omitted", "not_reached"]);
  });
});

describe("composed battery", () => {
  function keyedDecisions(item: { decisions: Array<{ id: string }> }) {
    return item.decisions.map((decision, index) => ({
      decisionId: decision.id,
      choiceId: index % 2 === 0 ? "same" : "different",
    }));
  }

  it("runs Gf, Gs, and WM in order, with a break after Gf", async () => {
    const userId = await freshUser();
    const overview = await service.getOverview("composed-test-battery");
    expect(overview.sections.map((row) => row.domain)).toEqual([
      "gf",
      "gs",
      "gwm",
    ]);
    expect(overview.sections[0]).toMatchObject({
      breakAfter: true,
      breakMaxMs: 15_000,
    });

    const state = await startSession(userId, "composed-test-battery");
    expect(state.sections.map((row) => row.domain)).toEqual([
      "gf",
      "gs",
      "gwm",
    ]);
    expect(state.sections[0]?.breakAfter).toBe(true);

    const afterGf = await finishSection(userId, state.id, 1);
    expect(afterGf.sections[0]?.status).toBe("submitted");
    expect(afterGf.sections[0]?.submittedAt).toBeTruthy();
    expect(afterGf.sections[0]?.breakAfter).toBe(true);
    expect(afterGf.current).toBeNull();
    expect(afterGf.report).toBeNull();

    await service.startSection(userId, state.id, 2);
    const gsSample = await service.serveNextItem(userId, state.id);
    const gsSampleItem = gsSample.current?.item;
    if (!gsSampleItem || !("decisions" in gsSampleItem)) {
      throw new Error("expected a Gs sample");
    }
    await service.submitResponse(userId, state.id, {
      itemInstanceId: gsSampleItem.itemInstanceId,
      choiceId: null,
      decisions: keyedDecisions(gsSampleItem),
      clientShownAt: null,
      clientFirstInteractionAt: null,
      clientAnsweredAt: null,
    });
    const gsTrial = await service.serveNextItem(userId, state.id);
    const gsItem = gsTrial.current?.item;
    if (!gsItem || !("decisions" in gsItem)) {
      throw new Error("expected a Gs trial");
    }
    await service.submitResponse(userId, state.id, {
      itemInstanceId: gsItem.itemInstanceId,
      choiceId: null,
      decisions: keyedDecisions(gsItem),
      clientShownAt: null,
      clientFirstInteractionAt: null,
      clientAnsweredAt: null,
    });

    await service.startSection(userId, state.id, 3);
    for (let index = 0; index < 3; index += 1) {
      const served = await service.serveNextItem(userId, state.id);
      const trial = served.current?.item;
      if (!trial || !("sequence" in trial)) {
        throw new Error("expected a span trial");
      }
      const done = await service.submitResponse(userId, state.id, {
        itemInstanceId: trial.itemInstanceId,
        choiceId: null,
        recalled: [],
        clientShownAt: null,
        clientFirstInteractionAt: null,
        clientAnsweredAt: null,
      });
      if (index === 2) {
        expect(done.status).toBe("completed");
        expect(done.report?.estimatedIq).toBeNull();
        expect(done.report?.sections.map((row) => row.domain)).toEqual([
          "gf",
          "gs",
          "gwm",
        ]);
      }
    }
  });
});
