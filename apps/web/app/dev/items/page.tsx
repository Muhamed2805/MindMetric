import { type ItemContent, loadBatteryCatalog } from "@mindmetric/catalog";
import {
  isSpanFormDefinition,
  isSpanTrialContent,
  isSpeedFormDefinition,
  isSpeedTrialContent,
  type PowerMcqItemContent,
  type PowerStimulus,
  type SpanTrialContent,
  type SpeedTrialContent,
  speedKey,
} from "@mindmetric/shared";
import { FigureView } from "@mindmetric/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Item review",
};

type ReviewKind = "scored" | "sample" | "unused";

type ReviewItem = {
  itemId: string;
  revisionId: string;
  revision: number;
  status: string;
  content: ItemContent;
};

function reviewKindLabel(kind: ReviewKind, position: number) {
  if (kind === "sample") {
    return "Sample";
  }
  if (kind === "unused") {
    return "Unused";
  }
  return `Item ${position}`;
}

function Stimulus({
  stimulus,
  idPrefix,
  cellSize,
}: {
  stimulus: PowerStimulus;
  idPrefix: string;
  cellSize: number;
}) {
  if (stimulus.type === "text") {
    return <p className="font-serif text-lg text-ink">{stimulus.text}</p>;
  }
  return (
    <FigureView
      spec={stimulus.figure}
      idPrefix={idPrefix}
      cellSize={cellSize}
    />
  );
}

function PowerItemCard({
  entry,
  position,
  kind,
  content,
}: {
  entry: ReviewItem;
  position: number;
  kind: ReviewKind;
  content: PowerMcqItemContent;
}) {
  return (
    <article className="mm-panel flex flex-col gap-4 p-5">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted">
        <span className="font-serif text-base text-ink">
          {reviewKindLabel(kind, position)}
        </span>
        <span>{entry.itemId}</span>
        <span>rev {entry.revision}</span>
        <span>{entry.status}</span>
        <span>{content.difficulty}</span>
        {content.anchor ? <span className="text-mark">anchor</span> : null}
      </header>

      <Stimulus
        stimulus={content.stimulus}
        idPrefix={`${entry.revisionId}-stem`}
        cellSize={76}
      />

      <div className="flex flex-wrap gap-3">
        {content.choices.map((choice) => {
          const isKey = choice.id === content.correctChoiceId;
          return (
            <div
              key={choice.id}
              className="flex flex-col items-center gap-1 rounded-xl border border-line p-2"
            >
              <Stimulus
                stimulus={choice.content}
                idPrefix={`${entry.revisionId}-${choice.id}`}
                cellSize={54}
              />
              <span
                className={isKey ? "text-sm text-mark" : "text-sm text-muted"}
              >
                {choice.id}
                {isKey ? " · key" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function SpeedTrialCard({
  entry,
  position,
  kind,
  content,
}: {
  entry: ReviewItem;
  position: number;
  kind: ReviewKind;
  content: SpeedTrialContent;
}) {
  return (
    <article className="mm-panel flex flex-col gap-4 p-5">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted">
        <span className="font-serif text-base text-ink">
          {kind === "sample"
            ? "Sample trial"
            : kind === "unused"
              ? "Unused trial"
              : `Trial ${position}`}
        </span>
        <span>{entry.itemId}</span>
        <span>rev {entry.revision}</span>
        <span>{entry.status}</span>
        <span>{content.decisions.length} decisions</span>
      </header>

      <p className="font-serif text-lg text-ink">{content.prompt}</p>

      <div className="flex flex-col gap-3">
        {content.decisions.map((decision) => {
          const key = speedKey(decision);
          return (
            <div
              key={decision.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-line p-3"
            >
              <span className="text-sm text-muted">{decision.id}</span>
              <FigureView
                spec={decision.left}
                idPrefix={`${entry.revisionId}-${decision.id}-l`}
                cellSize={48}
              />
              <FigureView
                spec={decision.right}
                idPrefix={`${entry.revisionId}-${decision.id}-r`}
                cellSize={48}
              />
              <span className="text-sm text-mark">{key}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function SpanTrialCard({
  entry,
  position,
  kind,
  content,
}: {
  entry: ReviewItem;
  position: number;
  kind: ReviewKind;
  content: SpanTrialContent;
}) {
  return (
    <article className="mm-panel flex flex-col gap-4 p-5">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted">
        <span className="font-serif text-base text-ink">
          {kind === "sample"
            ? "Sample trial"
            : kind === "unused"
              ? "Unused trial"
              : `Trial ${position}`}
        </span>
        <span>{entry.itemId}</span>
        <span>rev {entry.revision}</span>
        <span>{entry.status}</span>
        <span>length {content.length}</span>
        <span>{content.recall}</span>
      </header>
      <p className="text-sm leading-6 text-muted">
        {content.procedure} on a {content.grid.rows}×{content.grid.cols} grid.
        The sequence is generated per session, so there is no fixed key to
        review here.
      </p>
    </article>
  );
}

function ItemCard({
  entry,
  position,
  kind,
}: {
  entry: ReviewItem;
  position: number;
  kind: ReviewKind;
}) {
  if (isSpeedTrialContent(entry.content)) {
    return (
      <SpeedTrialCard
        entry={entry}
        position={position}
        kind={kind}
        content={entry.content}
      />
    );
  }
  if (isSpanTrialContent(entry.content)) {
    return (
      <SpanTrialCard
        entry={entry}
        position={position}
        kind={kind}
        content={entry.content}
      />
    );
  }
  return (
    <PowerItemCard
      entry={entry}
      position={position}
      kind={kind}
      content={entry.content}
    />
  );
}

function latestUnusedItems(
  banks: ReturnType<typeof loadBatteryCatalog>["banks"],
  pinnedRevisionIds: Set<string>,
): { slug: string; domain: string; entries: ReviewItem[] }[] {
  return banks
    .map((bank) => {
      const entries: ReviewItem[] = [];
      for (const item of bank.items) {
        if (item.revisions.some((row) => pinnedRevisionIds.has(row.id))) {
          continue;
        }
        if (item.revisions.length === 0) {
          continue;
        }
        const latest = item.revisions.reduce((best, row) =>
          row.revision >= best.revision ? row : best,
        );
        entries.push({
          itemId: item.id,
          revisionId: latest.id,
          revision: latest.revision,
          status: latest.status,
          content: latest.content,
        });
      }
      return { slug: bank.slug, domain: bank.domain, entries };
    })
    .filter((group) => group.entries.length > 0);
}

export default function DevItemsPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const catalog = loadBatteryCatalog();

  const byRevision = new Map<string, ReviewItem>();
  for (const bank of catalog.banks) {
    for (const item of bank.items) {
      for (const revision of item.revisions) {
        byRevision.set(revision.id, {
          itemId: item.id,
          revisionId: revision.id,
          revision: revision.revision,
          status: revision.status,
          content: revision.content,
        });
      }
    }
  }

  const pinnedRevisionIds = new Set<string>();
  for (const form of catalog.forms) {
    for (const version of form.versions) {
      for (const id of version.definition.sampleItemRevisionIds) {
        pinnedRevisionIds.add(id);
      }
      for (const id of version.definition.itemRevisionIds) {
        pinnedRevisionIds.add(id);
      }
    }
  }
  const unused = latestUnusedItems(catalog.banks, pinnedRevisionIds);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl font-medium text-ink">
          Item review
        </h1>
        <p className="text-base leading-6 text-muted">
          Development only. Answer keys are visible here so authored items can
          be reviewed before a revision is published. Form sections show the
          pinned order; unused bank items sit below so extras can be reviewed
          before they are pinned or discarded.
        </p>
      </header>

      {catalog.forms.map((form) =>
        form.versions.map((version) => {
          const samples = version.definition.sampleItemRevisionIds
            .map((id) => byRevision.get(id))
            .filter((entry): entry is ReviewItem => entry !== undefined);
          const scored = version.definition.itemRevisionIds
            .map((id) => byRevision.get(id))
            .filter((entry): entry is ReviewItem => entry !== undefined);
          const timing = isSpeedFormDefinition(version.definition)
            ? `Trial limit ${Math.round(version.definition.trialTimeLimitMs / 1000)}s`
            : isSpanFormDefinition(version.definition)
              ? `Section limit ${Math.round(version.definition.sectionTimeLimitMs / 1000)}s · stimulus ${version.definition.stimulusMs}ms · recall ceiling ${Math.round(version.definition.recallCeilingMs / 1000)}s`
              : `Section limit ${Math.round(version.definition.sectionTimeLimitMs / 1000)}s · item ceiling ${Math.round(version.definition.itemCeilingMs / 1000)}s`;

          return (
            <section key={version.id} className="flex flex-col gap-4">
              <h2 className="font-serif text-xl text-ink">
                {form.title} · {form.domain} · v{version.version} ·{" "}
                {version.status}
              </h2>
              <p className="text-sm text-muted">
                {timing} · {scored.length} scored · {samples.length} sample
              </p>

              {samples.map((entry, index) => (
                <ItemCard
                  key={entry.revisionId}
                  entry={entry}
                  position={index + 1}
                  kind="sample"
                />
              ))}
              {scored.map((entry, index) => (
                <ItemCard
                  key={entry.revisionId}
                  entry={entry}
                  position={index + 1}
                  kind="scored"
                />
              ))}
            </section>
          );
        }),
      )}

      {unused.map((group) => (
        <section key={group.slug} className="flex flex-col gap-4">
          <h2 className="font-serif text-xl text-ink">
            Unused bank items · {group.domain} · {group.slug}
          </h2>
          <p className="text-sm text-muted">
            {group.entries.length} revisions not pinned to a form
          </p>
          {group.entries.map((entry, index) => (
            <ItemCard
              key={entry.revisionId}
              entry={entry}
              position={index + 1}
              kind="unused"
            />
          ))}
        </section>
      ))}
    </main>
  );
}
