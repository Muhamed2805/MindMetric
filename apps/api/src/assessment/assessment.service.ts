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
  isCttScore,
  SCORING_MODEL,
  scoreLikertCtt,
} from "@mindmetric/scoring-core";
import {
  allItemsAnswered,
  isLikertDefinition,
  isLikertValue,
  toClientLikertItem,
} from "@mindmetric/shared";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";

@Injectable()
export class AssessmentService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async start(userId: string, instrumentSlug: string) {
    const published = await this.db
      .select({
        version: instrumentVersion,
        title: instrument.title,
        slug: instrument.slug,
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
    if (!match || !isLikertDefinition(match.version.definition)) {
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
    const startedAt = new Date();
    await this.db.insert(assessment).values({
      id,
      userId,
      instrumentVersionId: match.version.id,
      status: "in_progress",
      startedAt,
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
      const score = isCttScore(row.result) ? row.result : null;
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
    const rows = await this.db
      .select({
        assessment,
        version: instrumentVersion,
        title: instrument.title,
        slug: instrument.slug,
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
    const definition = row.version.definition;
    if (!isLikertDefinition(definition)) {
      throw new NotFoundException("Assessment not found.");
    }

    const answers = await this.db
      .select()
      .from(assessmentAnswer)
      .where(eq(assessmentAnswer.assessmentId, assessmentId));

    const answerMap = Object.fromEntries(
      answers.map((answer) => [answer.itemId, answer.value]),
    );

    let score: CttScore | null = null;
    if (row.assessment.status === "completed") {
      score = await this.loadOrCreateScore(assessmentId, definition, answerMap);
    }

    return {
      id: row.assessment.id,
      status: row.assessment.status,
      startedAt: row.assessment.startedAt,
      completedAt: row.assessment.completedAt,
      title: row.title,
      slug: row.slug,
      version: row.version.version,
      items: definition.items.map(toClientLikertItem),
      answers: answerMap,
      score,
    };
  }

  async saveAnswer(
    userId: string,
    assessmentId: string,
    itemId: string,
    value: unknown,
  ) {
    const session = await this.getForUser(userId, assessmentId);
    if (session.status !== "in_progress") {
      throw new BadRequestException("This assessment is already closed.");
    }

    const item = session.items.find((entry) => entry.id === itemId);
    if (!item || !isLikertValue(item, value)) {
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
        .set({ value, answeredAt: now })
        .where(eq(assessmentAnswer.id, found.id));
    } else {
      await this.db.insert(assessmentAnswer).values({
        id: randomUUID(),
        assessmentId,
        itemId,
        value,
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

  private async loadOrCreateScore(
    assessmentId: string,
    definition: Parameters<typeof scoreLikertCtt>[0],
    answers: Record<string, unknown>,
  ) {
    const existing = await this.db
      .select()
      .from(assessmentResult)
      .where(eq(assessmentResult.assessmentId, assessmentId))
      .limit(1);
    const stored = existing[0];
    if (stored && isCttScore(stored.payload)) {
      return stored.payload;
    }

    const payload = scoreLikertCtt(definition, answers);
    try {
      await this.db.insert(assessmentResult).values({
        id: randomUUID(),
        assessmentId,
        model: SCORING_MODEL,
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
      if (again && isCttScore(again.payload)) {
        return again.payload;
      }
    }
    return payload;
  }
}
