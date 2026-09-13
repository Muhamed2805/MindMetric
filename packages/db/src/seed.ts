import { LIKERT_ENGINE, type LikertDefinition } from "@mindmetric/shared";
import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { instrument, instrumentVersion } from "./schema";

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

const sixItemDevelopmentNorms = {
  kind: "development" as const,
  points: [
    { score: 6, percentile: 1 },
    { score: 10, percentile: 8 },
    { score: 14, percentile: 22 },
    { score: 18, percentile: 48 },
    { score: 22, percentile: 72 },
    { score: 26, percentile: 90 },
    { score: 30, percentile: 99 },
  ],
};

type SeedInstrument = {
  id: string;
  slug: string;
  title: string;
  description: string;
  versionId: string;
  definition: LikertDefinition;
};

export const seedInstruments: SeedInstrument[] = [
  {
    id: "inst_work_attention",
    slug: "work-attention",
    title: "Work attention",
    description:
      "A short Likert scale about staying with work despite interruptions.",
    versionId: "ver_work_attention_1",
    definition: {
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
          prompt:
            "I start new tasks before the current one is in a stable place.",
          reverse: true,
          scale: fivePoint,
        },
        {
          id: "wa-5",
          type: "likert",
          prompt:
            "I can work for a stretch without checking unrelated messages.",
          scale: fivePoint,
        },
        {
          id: "wa-6",
          type: "likert",
          prompt:
            "After an interruption, I return to the same point in the work.",
          scale: fivePoint,
        },
      ],
      scoring: {
        model: "ctt-v1",
        bands: [
          {
            upTo: 14,
            id: "lower",
            label: "Lower reported work attention",
          },
          {
            upTo: 22,
            id: "typical",
            label: "Typical reported work attention",
          },
          {
            upTo: 30,
            id: "higher",
            label: "Higher reported work attention",
          },
        ],
        norms: sixItemDevelopmentNorms,
      },
    },
  },
  {
    id: "inst_work_emotion",
    slug: "work-emotion-awareness",
    title: "Workplace emotional awareness",
    description:
      "A short Likert scale about noticing your own feelings and others' at work.",
    versionId: "ver_work_emotion_1",
    definition: {
      engine: LIKERT_ENGINE,
      items: [
        {
          id: "we-1",
          type: "likert",
          prompt: "I can name what I am feeling while I am still at work.",
          scale: fivePoint,
        },
        {
          id: "we-2",
          type: "likert",
          prompt:
            "I notice a colleague's mood only after I have already reacted.",
          reverse: true,
          scale: fivePoint,
        },
        {
          id: "we-3",
          type: "likert",
          prompt: "When a meeting gets tense, I can still tell what I need.",
          scale: fivePoint,
        },
        {
          id: "we-4",
          type: "likert",
          prompt:
            "I push uncomfortable feelings aside until the workday is over.",
          reverse: true,
          scale: fivePoint,
        },
        {
          id: "we-5",
          type: "likert",
          prompt:
            "I can tell a colleague is frustrated even when they stay polite.",
          scale: fivePoint,
        },
        {
          id: "we-6",
          type: "likert",
          prompt:
            "After a hard conversation, I know whether I am calm enough to continue.",
          scale: fivePoint,
        },
      ],
      scoring: {
        model: "ctt-v1",
        bands: [
          {
            upTo: 14,
            id: "lower",
            label: "Lower reported emotional awareness at work",
          },
          {
            upTo: 22,
            id: "typical",
            label: "Typical reported emotional awareness at work",
          },
          {
            upTo: 30,
            id: "higher",
            label: "Higher reported emotional awareness at work",
          },
        ],
        norms: sixItemDevelopmentNorms,
      },
    },
  },
];

export async function seedCatalog(db: Database) {
  const now = new Date();

  for (const seed of seedInstruments) {
    const existing = await db
      .select({ id: instrument.id })
      .from(instrument)
      .where(eq(instrument.slug, seed.slug))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(instrument).values({
        id: seed.id,
        slug: seed.slug,
        title: seed.title,
        description: seed.description,
        kind: LIKERT_ENGINE,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await db
        .update(instrument)
        .set({
          title: seed.title,
          description: seed.description,
          updatedAt: now,
        })
        .where(eq(instrument.id, seed.id));
    }

    const version = await db
      .select({ id: instrumentVersion.id })
      .from(instrumentVersion)
      .where(eq(instrumentVersion.id, seed.versionId))
      .limit(1);

    if (version.length === 0) {
      await db.insert(instrumentVersion).values({
        id: seed.versionId,
        instrumentId: seed.id,
        version: 1,
        status: "published",
        definition: seed.definition,
        publishedAt: now,
        createdAt: now,
      });
    } else {
      await db
        .update(instrumentVersion)
        .set({ definition: seed.definition })
        .where(eq(instrumentVersion.id, seed.versionId));
    }
  }
}
