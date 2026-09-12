import { LIKERT_ENGINE, type LikertDefinition } from "@mindmetric/shared";
import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { instrument, instrumentVersion } from "./schema";

const INSTRUMENT_ID = "inst_work_attention";
const VERSION_ID = "ver_work_attention_1";
const SLUG = "work-attention";

const fivePoint = {
  min: 1,
  max: 5,
  anchors: [
    { value: 1, label: "Strongly disagree" },
    { value: 2, label: "Disagree" },
    { value: 3, label: "Neither agree nor disagree" },
    { value: 4, label: "Agree" },
    { value: 5, label: "Strongly agree" },
  ],
};

const definition: LikertDefinition = {
  engine: LIKERT_ENGINE,
  items: [
    {
      id: "wa-1",
      type: "likert",
      prompt: "I stay with a task until the important parts are finished.",
      scale: fivePoint,
    },
    {
      id: "wa-2",
      type: "likert",
      prompt: "Nearby conversations pull my attention away from work.",
      reverse: true,
      scale: fivePoint,
    },
    {
      id: "wa-3",
      type: "likert",
      prompt: "I notice when my focus has drifted and bring it back.",
      scale: fivePoint,
    },
    {
      id: "wa-4",
      type: "likert",
      prompt: "I start new tasks before the current one is in a stable place.",
      reverse: true,
      scale: fivePoint,
    },
    {
      id: "wa-5",
      type: "likert",
      prompt: "I can work for a stretch without checking unrelated messages.",
      scale: fivePoint,
    },
    {
      id: "wa-6",
      type: "likert",
      prompt: "After an interruption, I return to the same point in the work.",
      scale: fivePoint,
    },
  ],
};

export async function seedCatalog(db: Database) {
  const existing = await db
    .select({ id: instrument.id })
    .from(instrument)
    .where(eq(instrument.slug, SLUG))
    .limit(1);

  const now = new Date();

  if (existing.length === 0) {
    await db.insert(instrument).values({
      id: INSTRUMENT_ID,
      slug: SLUG,
      title: "Work attention",
      description:
        "A short Likert scale about staying with work despite interruptions. Scoring comes in a later phase.",
      kind: LIKERT_ENGINE,
      createdAt: now,
      updatedAt: now,
    });
  }

  const version = await db
    .select({ id: instrumentVersion.id })
    .from(instrumentVersion)
    .where(eq(instrumentVersion.id, VERSION_ID))
    .limit(1);

  if (version.length === 0) {
    await db.insert(instrumentVersion).values({
      id: VERSION_ID,
      instrumentId: INSTRUMENT_ID,
      version: 1,
      status: "published",
      definition,
      publishedAt: now,
      createdAt: now,
    });
  }
}
