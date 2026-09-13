import { randomUUID } from "node:crypto";
import {
  assessment,
  assessmentAnswer,
  assessmentResult,
  type Database,
  instrument,
  instrumentVersion,
} from "@mindmetric/db";
import {
  type CttScore,
  isStoredScore,
  SCORING_MODEL,
  type SumCorrectScore,
  scoreLikertCtt,
  scoreMcqTimed,
} from "@mindmetric/scoring-core";
import {
  allItemsAnswered,
  isLikertDefinition,
  isLikertValue,
  isMcqTimedDefinition,
  normalizeMcqAnswer,
  SUM_CORRECT_MODEL,
  toClientLikertItem,
  toClientMcqItem,
} from "@mindmetric/shared";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";

type StoredScore = CttScore | SumCorrectScore;

@Injectable()
export class AssessmentService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async start(userId: string, instrumentSlug: string) {
    const published = await this.db
      .select({
        version: instrumentVersion,
        title: instrument.title,
        slug: instrument.slug,
        kind: instrument.kind,
      })
      .from(instrument)
      .innerJoin(
        instrumentVersion,
        eq(instrumentVersion.instrumentId, instrument.id),
      )
      .where(
        and(
          eq(instrument.slug, instrumentSlug),
          eq(instrumentVersion.status, "published"),
        ),
      )
      .orderBy(desc(instrumentVersion.version))
      .limit(1);

    const match = published[0];
    const definition = match?.version.definition;
    if (
      !match ||
      (!isLikertDefinition(definition) && !isMcqTimedDefinition(definition))
    ) {
      throw new NotFoundException("Instrument not found.");
    }

    const open = await this.db
      .select()
      .from(assessment)
      .where(
        and(
          eq(assessment.userId, userId),
          eq(assessment.instrumentVersionId, match.version.id),
          eq(assessment.status, "in_progress"),
        ),
      )
      .limit(1);

    const existing = open[0];
    if (existing) {
      return this.getForUser(userId, existing.id);
    }

    const id = randomUUID();
    await this.db.insert(assessment).values({
      id,
      userId,
      instrumentVersionId: match.version.id,
      status: "in_progress",
      startedAt: new Date(),
      completedAt: null,
    });

    return this.getForUser(userId, id);
  }

  async listForUser(userId: string) {
    const rows = await this.db
      .select({
        id: assessment.id,
        status: assessment.status,
        startedAt: assessment.startedAt,
        completedAt: assessment.completedAt,
        title: instrument.title,
        slug: instrument.slug,
        version: instrumentVersion.version,
        result: assessmentResult.payload,
      })
      .from(assessment)
      .innerJoin(
        instrumentVersion,
        eq(instrumentVersion.id, assessment.instrumentVersionId),
      )
      .innerJoin(instrument, eq(instrument.id, instrumentVersion.instrumentId))
      .leftJoin(
        assessmentResult,
        eq(assessmentResult.assessmentId, assessment.id),
      )
      .where(eq(assessment.userId, userId))
      .orderBy(desc(assessment.startedAt));

    return rows.map((row) => {
      const score = isStoredScore(row.result) ? row.result : null;
      return {
        id: row.id,
        status: row.status,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        title: row.title,
        slug: row.slug,
        version: row.version,
        score: score
          ? {
              raw: score.raw,
              max: score.max,
              percentile: score.percentile,
              band: score.band,
            }
          : null,
      };
    });
  }

  async getForUser(userId: string, assessmentId: string) {
    const row = await this.loadOwned(userId, assessmentId);
    const definition = row.version.definition;
    const answers = await this.answerMap(assessmentId);

    let items: Array<
      ReturnType<typeof toClientLikertItem> | ReturnType<typeof toClientMcqItem>
    >;
    let score: StoredScore | null = null;

    if (isLikertDefinition(definition)) {
      items = definition.items.map(toClientLikertItem);
      if (row.assessment.status === "completed") {
        score = await this.loadOrCreateScore(assessmentId, definition, answers);
      }
    } else if (isMcqTimedDefinition(definition)) {
      items = definition.items.map(toClientMcqItem);
      if (row.assessment.status === "completed") {
        score = await this.loadOrCreateScore(assessmentId, definition, answers);
      }
    } else {
      throw new NotFoundException("Assessment not found.");
    }

    return {
      id: row.assessment.id,
      status: row.assessment.status,
      startedAt: row.assessment.startedAt,
      completedAt: row.assessment.completedAt,
      title: row.title,
      slug: row.slug,
      kind: row.kind,
      version: row.version.version,
      items,
      answers,
      score,
    };
  }

  async saveAnswer(
    userId: string,
    assessmentId: string,
    itemId: string,
    value: unknown,
  ) {
    const row = await this.loadOwned(userId, assessmentId);
    if (row.assessment.status !== "in_progress") {
      throw new BadRequestException("This assessment is already closed.");
    }

    const definition = row.version.definition;
    let stored: unknown = value;

    if (isLikertDefinition(definition)) {
      const item = definition.items.find((entry) => entry.id === itemId);
      if (!item || !isLikertValue(item, value)) {
        throw new BadRequestException("Invalid answer.");
      }
    } else if (isMcqTimedDefinition(definition)) {
      const item = definition.items.find((entry) => entry.id === itemId);
      const normalized = item ? normalizeMcqAnswer(item, value) : null;
      if (!item || !normalized) {
        throw new BadRequestException("Invalid answer.");
      }
      stored = normalized;
    } else {
      throw new BadRequestException("Invalid answer.");
    }

    const now = new Date();
    const existing = await this.db
      .select({ id: assessmentAnswer.id })
      .from(assessmentAnswer)
      .where(
        and(
          eq(assessmentAnswer.assessmentId, assessmentId),
          eq(assessmentAnswer.itemId, itemId),
        ),
      )
      .limit(1);

    const found = existing[0];
    if (found) {
      await this.db
        .update(assessmentAnswer)
        .set({ value: stored, answeredAt: now })
        .where(eq(assessmentAnswer.id, found.id));
    } else {
      await this.db.insert(assessmentAnswer).values({
        id: randomUUID(),
        assessmentId,
        itemId,
        value: stored,
        answeredAt: now,
      });
    }

    return this.getForUser(userId, assessmentId);
  }

  async complete(userId: string, assessmentId: string) {
    const session = await this.getForUser(userId, assessmentId);
    if (session.status !== "in_progress") {
      throw new BadRequestException("This assessment is already closed.");
    }

    const answeredIds = Object.keys(session.answers);
    if (
      !allItemsAnswered(
        session.items.map((item) => item.id),
        answeredIds,
      )
    ) {
      throw new BadRequestException("Answer every item before finishing.");
    }

    await this.db
      .update(assessment)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(assessment.id, assessmentId));

    return this.getForUser(userId, assessmentId);
  }

  private async loadOwned(userId: string, assessmentId: string) {
    const rows = await this.db
      .select({
        assessment,
        version: instrumentVersion,
        title: instrument.title,
        slug: instrument.slug,
        kind: instrument.kind,
      })
      .from(assessment)
      .innerJoin(
        instrumentVersion,
        eq(instrumentVersion.id, assessment.instrumentVersionId),
      )
      .innerJoin(instrument, eq(instrument.id, instrumentVersion.instrumentId))
      .where(
        and(eq(assessment.id, assessmentId), eq(assessment.userId, userId)),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new NotFoundException("Assessment not found.");
    }
    return row;
  }

  private async answerMap(assessmentId: string) {
    const answers = await this.db
      .select()
      .from(assessmentAnswer)
      .where(eq(assessmentAnswer.assessmentId, assessmentId));
    return Object.fromEntries(
      answers.map((answer) => [answer.itemId, answer.value]),
    );
  }

  private async loadOrCreateScore(
    assessmentId: string,
    definition:
      | Parameters<typeof scoreLikertCtt>[0]
      | Parameters<typeof scoreMcqTimed>[0],
    answers: Record<string, unknown>,
  ) {
    const existing = await this.db
      .select()
      .from(assessmentResult)
      .where(eq(assessmentResult.assessmentId, assessmentId))
      .limit(1);
    const stored = existing[0];
    if (stored && isStoredScore(stored.payload)) {
      return stored.payload;
    }

    const payload = isLikertDefinition(definition)
      ? scoreLikertCtt(definition, answers)
      : scoreMcqTimed(definition, answers);
    const model = isLikertDefinition(definition)
      ? SCORING_MODEL
      : SUM_CORRECT_MODEL;

    try {
      await this.db.insert(assessmentResult).values({
        id: randomUUID(),
        assessmentId,
        model,
        payload,
        createdAt: new Date(),
      });
    } catch {
      const retry = await this.db
        .select()
        .from(assessmentResult)
        .where(eq(assessmentResult.assessmentId, assessmentId))
        .limit(1);
      const again = retry[0];
      if (again && isStoredScore(again.payload)) {
        return again.payload;
      }
    }
    return payload;
  }
}
