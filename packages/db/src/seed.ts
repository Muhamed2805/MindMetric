import { loadCatalogDocuments, planVersionWrite } from "@mindmetric/catalog";
import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { instrument, instrumentVersion } from "./schema";

export async function seedCatalog(db: Database) {
  const documents = loadCatalogDocuments();
  const now = new Date();

  for (const document of documents) {
    const existing = await db
      .select({ id: instrument.id })
      .from(instrument)
      .where(eq(instrument.slug, document.slug))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(instrument).values({
        id: document.id,
        slug: document.slug,
        title: document.title,
        description: document.description,
        kind: document.kind,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await db
        .update(instrument)
        .set({
          title: document.title,
          description: document.description,
          kind: document.kind,
          updatedAt: now,
        })
        .where(eq(instrument.id, document.id));
    }

    for (const version of document.versions) {
      const rows = await db
        .select({
          id: instrumentVersion.id,
          status: instrumentVersion.status,
          definition: instrumentVersion.definition,
        })
        .from(instrumentVersion)
        .where(eq(instrumentVersion.id, version.id))
        .limit(1);

      const action = planVersionWrite(rows[0], version, document.slug);

      if (action === "insert") {
        await db.insert(instrumentVersion).values({
          id: version.id,
          instrumentId: document.id,
          version: version.version,
          status: version.status,
          definition: version.definition,
          publishedAt: version.status === "published" ? now : null,
          createdAt: now,
        });
        continue;
      }

      if (action === "update-draft") {
        await db
          .update(instrumentVersion)
          .set({
            definition: version.definition,
            status: version.status,
            publishedAt: version.status === "published" ? now : null,
          })
          .where(eq(instrumentVersion.id, version.id));
      }
    }
  }
}
