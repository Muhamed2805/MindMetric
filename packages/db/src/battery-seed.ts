import type {
  BatteryDocument,
  ItemBankDocument,
  SubtestFormDocument,
} from "@mindmetric/catalog";
import { loadBatteryCatalog, planVersionWrite } from "@mindmetric/catalog";
import { eq } from "drizzle-orm";
import type { Database } from "./client";
import {
  battery,
  batteryVersion,
  item,
  itemRevision,
  subtestForm,
  subtestFormVersion,
} from "./schema";

async function seedItemBanks(
  db: Database,
  banks: ItemBankDocument[],
  now: Date,
) {
  for (const bank of banks) {
    for (const entry of bank.items) {
      const existing = await db
        .select({ id: item.id })
        .from(item)
        .where(eq(item.id, entry.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(item).values({
          id: entry.id,
          bankId: bank.id,
          domain: bank.domain,
          engine: bank.engine,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await db
          .update(item)
          .set({ bankId: bank.id, domain: bank.domain, updatedAt: now })
          .where(eq(item.id, entry.id));
      }

      for (const revision of entry.revisions) {
        const rows = await db
          .select({
            id: itemRevision.id,
            status: itemRevision.status,
            definition: itemRevision.content,
          })
          .from(itemRevision)
          .where(eq(itemRevision.id, revision.id))
          .limit(1);

        const action = planVersionWrite(
          rows[0],
          {
            id: revision.id,
            status: revision.status,
            definition: revision.content,
          },
          `${bank.slug}/${entry.id}`,
        );

        if (action === "insert") {
          await db.insert(itemRevision).values({
            id: revision.id,
            itemId: entry.id,
            revision: revision.revision,
            status: revision.status,
            content: revision.content,
            publishedAt: revision.status === "published" ? now : null,
            createdAt: now,
          });
          continue;
        }

        if (action === "update-draft") {
          await db
            .update(itemRevision)
            .set({
              content: revision.content,
              status: revision.status,
              publishedAt: revision.status === "published" ? now : null,
            })
            .where(eq(itemRevision.id, revision.id));
        }
      }
    }
  }
}

async function seedSubtestForms(
  db: Database,
  forms: SubtestFormDocument[],
  now: Date,
) {
  for (const form of forms) {
    const existing = await db
      .select({ id: subtestForm.id })
      .from(subtestForm)
      .where(eq(subtestForm.slug, form.slug))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(subtestForm).values({
        id: form.id,
        slug: form.slug,
        title: form.title,
        description: form.description,
        domain: form.domain,
        engine: form.engine,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await db
        .update(subtestForm)
        .set({
          title: form.title,
          description: form.description,
          domain: form.domain,
          engine: form.engine,
          updatedAt: now,
        })
        .where(eq(subtestForm.id, form.id));
    }

    for (const version of form.versions) {
      const rows = await db
        .select({
          id: subtestFormVersion.id,
          status: subtestFormVersion.status,
          definition: subtestFormVersion.definition,
        })
        .from(subtestFormVersion)
        .where(eq(subtestFormVersion.id, version.id))
        .limit(1);

      const action = planVersionWrite(rows[0], version, form.slug);

      if (action === "insert") {
        await db.insert(subtestFormVersion).values({
          id: version.id,
          formId: form.id,
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
          .update(subtestFormVersion)
          .set({
            definition: version.definition,
            status: version.status,
            publishedAt: version.status === "published" ? now : null,
          })
          .where(eq(subtestFormVersion.id, version.id));
      }
    }
  }
}

async function seedBatteries(
  db: Database,
  batteries: BatteryDocument[],
  now: Date,
) {
  for (const document of batteries) {
    const existing = await db
      .select({ id: battery.id })
      .from(battery)
      .where(eq(battery.slug, document.slug))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(battery).values({
        id: document.id,
        slug: document.slug,
        title: document.title,
        description: document.description,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await db
        .update(battery)
        .set({
          title: document.title,
          description: document.description,
          updatedAt: now,
        })
        .where(eq(battery.id, document.id));
    }

    for (const version of document.versions) {
      const rows = await db
        .select({
          id: batteryVersion.id,
          status: batteryVersion.status,
          definition: batteryVersion.definition,
        })
        .from(batteryVersion)
        .where(eq(batteryVersion.id, version.id))
        .limit(1);

      const action = planVersionWrite(rows[0], version, document.slug);

      if (action === "insert") {
        await db.insert(batteryVersion).values({
          id: version.id,
          batteryId: document.id,
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
          .update(batteryVersion)
          .set({
            definition: version.definition,
            status: version.status,
            publishedAt: version.status === "published" ? now : null,
          })
          .where(eq(batteryVersion.id, version.id));
      }
    }
  }
}

/** Item revisions, then forms, then batteries: references must already exist. */
export async function seedBatteryCatalog(db: Database) {
  const catalog = loadBatteryCatalog();
  const now = new Date();
  await seedItemBanks(db, catalog.banks, now);
  await seedSubtestForms(db, catalog.forms, now);
  await seedBatteries(db, catalog.batteries, now);
}
