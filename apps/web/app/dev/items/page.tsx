import { loadBatteryCatalog } from "@mindmetric/catalog";
import type { PowerMcqItemContent, PowerStimulus } from "@mindmetric/shared";
import { FigureView } from "@mindmetric/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Item review",
};

type ReviewItem = {
  itemId: string;
  revisionId: string;
  revision: number;
  status: string;
  content: PowerMcqItemContent;
};

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

function ItemCard({
  entry,
  position,
  kind,
}: {
  entry: ReviewItem;
  position: number;
  kind: "scored" | "sample";
}) {
  const { content } = entry;
  return (
    <article className="mm-panel flex flex-col gap-4 p-5">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted">
        <span className="font-serif text-base text-ink">
          {kind === "sample" ? "Sample" : `Item ${position}`}
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

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl font-medium text-ink">
          Item review
        </h1>
        <p className="text-base leading-6 text-muted">
          Development only. Answer keys are visible here so authored items can
          be reviewed before a revision is published.
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

          return (
            <section key={version.id} className="flex flex-col gap-4">
              <h2 className="font-serif text-xl text-ink">
                {form.title} · {form.domain} · v{version.version} ·{" "}
                {version.status}
              </h2>
              <p className="text-sm text-muted">
                Section limit{" "}
                {Math.round(version.definition.sectionTimeLimitMs / 1000)}s ·
                item ceiling{" "}
                {Math.round(version.definition.itemCeilingMs / 1000)}s ·{" "}
                {scored.length} scored · {samples.length} sample
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
    </main>
  );
}
