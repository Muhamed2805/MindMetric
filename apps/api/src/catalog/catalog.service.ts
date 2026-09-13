import { type Database, instrument, instrumentVersion } from "@mindmetric/db";
import {
  definitionEstimatedSeconds,
  definitionItemCount,
  isLikertDefinition,
  isMcqTimedDefinition,
  LIKERT_ENGINE,
  MCQ_TIMED_ENGINE,
  toClientLikertItem,
  toClientMcqItem,
} from "@mindmetric/shared";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";

@Injectable()
export class CatalogService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listPublished() {
    const versions = await this.db
      .select({
        slug: instrument.slug,
        title: instrument.title,
        description: instrument.description,
        kind: instrument.kind,
        versionId: instrumentVersion.id,
        version: instrumentVersion.version,
        definition: instrumentVersion.definition,
      })
      .from(instrumentVersion)
      .innerJoin(instrument, eq(instrument.id, instrumentVersion.instrumentId))
      .where(eq(instrumentVersion.status, "published"))
      .orderBy(asc(instrument.title), desc(instrumentVersion.publishedAt));

    const seen = new Set<string>();
    return versions
      .filter((row) => {
        if (seen.has(row.slug)) {
          return false;
        }
        seen.add(row.slug);
        return true;
      })
      .map((row) => {
        const definition =
          isLikertDefinition(row.definition) ||
          isMcqTimedDefinition(row.definition)
            ? row.definition
            : null;
        return {
          slug: row.slug,
          title: row.title,
          description: row.description,
          kind: row.kind,
          versionId: row.versionId,
          version: row.version,
          itemCount: definition ? definitionItemCount(definition) : 0,
          estimatedSeconds: definition
            ? definitionEstimatedSeconds(definition)
            : 0,
        };
      });
  }

  async getPublishedBySlug(slug: string) {
    const rows = await this.db
      .select({
        instrument,
        version: instrumentVersion,
      })
      .from(instrument)
      .innerJoin(
        instrumentVersion,
        eq(instrumentVersion.instrumentId, instrument.id),
      )
      .where(
        and(
          eq(instrument.slug, slug),
          eq(instrumentVersion.status, "published"),
        ),
      )
      .orderBy(desc(instrumentVersion.version))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new NotFoundException("Instrument not found.");
    }

    const definition = row.version.definition;
    const kind = row.instrument.kind;

    if (kind === LIKERT_ENGINE && isLikertDefinition(definition)) {
      return {
        slug: row.instrument.slug,
        title: row.instrument.title,
        description: row.instrument.description,
        kind,
        versionId: row.version.id,
        version: row.version.version,
        itemCount: definition.items.length,
        estimatedSeconds: definitionEstimatedSeconds(definition),
        items: definition.items.map(toClientLikertItem),
      };
    }

    if (kind === MCQ_TIMED_ENGINE && isMcqTimedDefinition(definition)) {
      return {
        slug: row.instrument.slug,
        title: row.instrument.title,
        description: row.instrument.description,
        kind,
        versionId: row.version.id,
        version: row.version.version,
        itemCount: definition.items.length,
        estimatedSeconds: definitionEstimatedSeconds(definition),
        items: definition.items.map(toClientMcqItem),
      };
    }

    throw new NotFoundException("Instrument definition is not available.");
  }

  async getPublishedVersion(versionId: string) {
    const rows = await this.db
      .select()
      .from(instrumentVersion)
      .where(
        and(
          eq(instrumentVersion.id, versionId),
          eq(instrumentVersion.status, "published"),
        ),
      )
      .limit(1);

    const version = rows[0];
    if (
      !version ||
      (!isLikertDefinition(version.definition) &&
        !isMcqTimedDefinition(version.definition))
    ) {
      throw new NotFoundException("Instrument version not found.");
    }

    return version;
  }
}
