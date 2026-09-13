"use client";

import type { ClientQualityEventKind } from "@mindmetric/shared";
import { Button, cn } from "@mindmetric/ui";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiSend } from "../lib/api";
import {
  type BatterySection,
  type BatterySessionState,
  isSpeedBatteryItem,
} from "../lib/battery-types";
import { clockLabel, domainLabel, minutesFromMs } from "../lib/format";
import { BatteryReportPanel } from "./battery-report";
import { SpeedTrialPlay } from "./speed-trial-play";
import { StimulusView } from "./stimulus-view";

/** Below this, the item clock is close enough to warn about. */
const CEILING_WARNING_MS = 15_000;
/** Below this, the section clock is worth drawing attention to. */
const SECTION_WARNING_MS = 60_000;

function nextSection(session: BatterySessionState): BatterySection | null {
  return (
    session.sections.find((section) => section.status === "pending") ?? null
  );
}

export function BatteryRunner({ initial }: { initial: BatterySessionState }) {
  const [session, setSession] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Deadlines are absolute server times, so every comparison is made against
  // the server's clock rather than the examinee's.
  const skew = useRef(Date.now() - new Date(initial.serverTime).getTime());
  const busy = useRef(false);
  const firstInteraction = useRef<string | null>(null);
  const expiryHandled = useRef<number | null>(null);

  const current = session.current;
  const item = current?.item ?? null;
  const serverNow = now - skew.current;

  const sectionRemainingMs = current?.deadlineAt
    ? new Date(current.deadlineAt).getTime() - serverNow
    : null;
  const itemRemainingMs =
    item?.shownAt && item.role === "scored" && current
      ? new Date(item.shownAt).getTime() + current.itemCeilingMs - serverNow
      : null;

  const logEvent = useCallback(
    (kind: ClientQualityEventKind, payload?: unknown) => {
      // Evidence must never interrupt an administration, so failures are
      // dropped rather than surfaced.
      void apiSend(`/battery/sessions/${initial.id}/quality-events`, {
        method: "POST",
        body: JSON.stringify({
          kind,
          occurredAt: new Date().toISOString(),
          payload: payload ?? null,
        }),
      }).catch(() => undefined);
    },
    [initial.id],
  );

  const applyState = useCallback((next: BatterySessionState) => {
    skew.current = Date.now() - new Date(next.serverTime).getTime();
    firstInteraction.current = null;
    setSelected(null);
    setSession(next);
  }, []);

  const guarded = useCallback(
    async (fn: () => Promise<BatterySessionState>) => {
      if (busy.current) {
        return;
      }
      busy.current = true;
      setPending(true);
      setError(null);
      try {
        applyState(await fn());
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Something failed.");
      } finally {
        busy.current = false;
        setPending(false);
      }
    },
    [applyState],
  );

  const serveNext = useCallback(
    () =>
      guarded(() =>
        apiSend<BatterySessionState>(
          `/battery/sessions/${initial.id}/items/next`,
          { method: "POST" },
        ),
      ),
    [guarded, initial.id],
  );

  const beginSection = useCallback(
    (position: number) =>
      guarded(async () => {
        await apiSend(
          `/battery/sessions/${initial.id}/sections/${position}/start`,
          { method: "POST" },
        );
        return apiSend<BatterySessionState>(
          `/battery/sessions/${initial.id}/items/next`,
          { method: "POST" },
        );
      }),
    [guarded, initial.id],
  );

  const submit = useCallback(
    (
      choiceId: string | null,
      decisions?: Array<{ decisionId: string; choiceId: string | null }>,
    ) => {
      if (!item) {
        return;
      }
      const target = item;
      return guarded(async () => {
        const after = await apiSend<BatterySessionState>(
          `/battery/sessions/${initial.id}/responses`,
          {
            method: "POST",
            body: JSON.stringify({
              itemInstanceId: target.itemInstanceId,
              choiceId,
              decisions,
              clientShownAt: target.shownAt,
              clientFirstInteractionAt: firstInteraction.current,
              clientAnsweredAt: new Date().toISOString(),
            }),
          },
        );
        // Last item of a section leaves no current item; the intro for the
        // next section (or the completion screen) is the next thing to show.
        if (
          after.status !== "in_progress" ||
          !after.current ||
          after.current.item
        ) {
          return after;
        }
        return apiSend<BatterySessionState>(
          `/battery/sessions/${initial.id}/items/next`,
          { method: "POST" },
        );
      });
    },
    [guarded, initial.id, item],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  // A running section with nothing on screen means the next item is owed,
  // which is also how a reload mid-section recovers.
  useEffect(() => {
    if (session.status !== "in_progress" || !current || current.item) {
      return;
    }
    void serveNext();
  }, [session.status, current, serveNext]);

  // The server decides what an expired section means; the client only asks.
  useEffect(() => {
    if (sectionRemainingMs === null || sectionRemainingMs > 0 || !current) {
      return;
    }
    if (expiryHandled.current === current.sectionPosition) {
      return;
    }
    expiryHandled.current = current.sectionPosition;
    void guarded(() =>
      apiSend<BatterySessionState>(`/battery/sessions/${initial.id}`),
    );
  }, [sectionRemainingMs, current, guarded, initial.id]);

  // Submitting at the ceiling keeps a real choice out of the timed-out bucket.
  useEffect(() => {
    if (itemRemainingMs === null || itemRemainingMs > 0 || !item) {
      return;
    }
    if (isSpeedBatteryItem(item)) {
      return;
    }
    void submit(selected);
  }, [itemRemainingMs, item, selected, submit]);

  useEffect(() => {
    if (initial.current?.item) {
      logEvent("session_resumed");
    }
  }, [initial.current?.item, logEvent]);

  useEffect(() => {
    const onVisibility = () =>
      logEvent(document.hidden ? "visibility_hidden" : "visibility_visible");
    const onBlur = () => logEvent("focus_lost");
    const onFocus = () => logEvent("focus_regained");
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(
        () =>
          logEvent("viewport_resized", {
            width: window.innerWidth,
            height: window.innerHeight,
          }),
        500,
      );
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("resize", onResize);
    };
  }, [logEvent]);

  // Only while a clock is running: leaving then costs measured time.
  useEffect(() => {
    if (!current?.deadlineAt) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [current?.deadlineAt]);

  const choose = useCallback((choiceId: string) => {
    firstInteraction.current ??= new Date().toISOString();
    setSelected(choiceId);
  }, []);

  useEffect(() => {
    if (!item || isSpeedBatteryItem(item)) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && selected) {
        void submit(selected);
        return;
      }
      const index = Number(event.key);
      if (!Number.isInteger(index) || index < 1) {
        return;
      }
      const choice = item.choices[index - 1];
      if (choice) {
        choose(choice.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, selected, submit, choose]);

  if (session.status === "completed") {
    return <Completed session={session} />;
  }

  const upcoming = nextSection(session);
  if (!current && upcoming) {
    return (
      <SectionIntro
        section={upcoming}
        total={session.sections.length}
        practice={session.isPracticeMode}
        pending={pending}
        error={error}
        onBegin={() => void beginSection(upcoming.position)}
      />
    );
  }

  if (!current || !item) {
    return (
      <Shell>
        <p className="text-sm text-muted">Preparing the next item…</p>
        {error ? <Problem message={error} /> : null}
      </Shell>
    );
  }

  const section = session.sections.find(
    (entry) => entry.position === current.sectionPosition,
  );
  const speed = isSpeedBatteryItem(item);
  const counter =
    item.role === "sample"
      ? speed
        ? "Sample trial"
        : "Sample"
      : `${speed ? "Trial" : "Item"} ${(section?.completedItemCount ?? 0) + 1} of ${section?.scoredItemCount ?? 0}`;
  const mainRemainingMs = speed ? itemRemainingMs : sectionRemainingMs;

  return (
    <Shell>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-widest text-mark">
            {domainLabel(current.domain)}
            {session.isPracticeMode ? " · practice" : ""}
          </span>
          <span className="text-sm text-muted">{counter}</span>
        </div>
        {mainRemainingMs === null ? (
          <span className="text-sm text-muted">Untimed</span>
        ) : (
          <p
            className={cn(
              "font-serif text-2xl tabular-nums",
              mainRemainingMs <
                (speed ? CEILING_WARNING_MS : SECTION_WARNING_MS)
                ? "text-danger"
                : "text-ink",
            )}
          >
            <span className="sr-only">
              {speed
                ? "Time left in this trial "
                : "Time left in this section "}
            </span>
            {clockLabel(mainRemainingMs)}
          </p>
        )}
      </header>

      {item.role === "sample" ? (
        <p className="text-sm text-muted">
          A sample, so you can see how the items work. It is not scored and the
          section clock has not started.
        </p>
      ) : null}

      {item.prompt ? (
        <p className="font-serif text-2xl font-medium leading-snug text-ink md:text-[1.75rem]">
          {item.prompt}
        </p>
      ) : null}

      {speed ? (
        <SpeedTrialPlay
          key={item.itemInstanceId}
          item={item}
          pending={pending}
          remainingMs={itemRemainingMs}
          onSubmit={(decisions) => void submit(null, decisions)}
        />
      ) : (
        <>
          <StimulusView
            stimulus={item.stimulus}
            idPrefix={`${item.itemInstanceId}-stem`}
            cellSize={84}
          />

          <div className="flex flex-wrap gap-3">
            {item.choices.map((choice, index) => {
              const active = selected === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  aria-pressed={active}
                  disabled={pending}
                  onClick={() => choose(choice.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-3 transition",
                    active
                      ? "border-accent bg-accent/5"
                      : "border-line hover:border-mark",
                    pending ? "opacity-60" : "",
                  )}
                >
                  <StimulusView
                    stimulus={choice.content}
                    idPrefix={`${item.itemInstanceId}-${choice.id}`}
                    cellSize={60}
                  />
                  <span className="text-xs text-muted tabular-nums">
                    {index + 1}
                  </span>
                </button>
              );
            })}
          </div>

          {itemRemainingMs !== null && itemRemainingMs < CEILING_WARNING_MS ? (
            <output className="text-sm text-danger">
              Time on this item is almost up.
            </output>
          ) : null}

          {error ? <Problem message={error} /> : null}

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              disabled={pending || !selected}
              onClick={() => void submit(selected)}
            >
              {pending ? "Saving" : "Next"}
            </Button>
            <p className="text-xs text-muted">
              Answers are final. A guess counts for more than a blank, and you
              cannot come back to an item.
            </p>
          </div>
        </>
      )}

      {speed && error ? <Problem message={error} /> : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}

function sectionBrief(section: BatterySection) {
  const clock = minutesFromMs(section.sectionTimeLimitMs);
  const unit = section.domain === "gs" ? "trials" : "items";
  if (section.sampleItemCount === 0) {
    return `${section.scoredItemCount} ${unit} under a ${clock} clock. The clock starts on the first ${section.domain === "gs" ? "trial" : "item"}.`;
  }
  const samples =
    section.sampleItemCount === 1
      ? "One untimed sample comes"
      : `${section.sampleItemCount} untimed samples come`;
  return `${samples} first, then ${section.scoredItemCount} ${unit} under a ${clock} clock.`;
}

function Problem({ message }: { message: string }) {
  return (
    <p className="text-sm text-danger" role="alert">
      {message}
    </p>
  );
}

function SectionIntro({
  section,
  total,
  practice,
  pending,
  error,
  onBegin,
}: {
  section: BatterySection;
  total: number;
  practice: boolean;
  pending: boolean;
  error: string | null;
  onBegin: () => void;
}) {
  return (
    <Shell>
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium uppercase tracking-widest text-mark">
          Section {section.position} of {total}
          {practice ? " · practice" : ""}
        </span>
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          {domainLabel(section.domain)}
        </h1>
      </div>

      <div className="mm-panel flex flex-col gap-3 p-5 text-sm leading-6 text-muted">
        <p>{sectionBrief(section)}</p>
        <p>
          {section.domain === "gs"
            ? "Each trial presents many pairs on this device. Work quickly and accurately; random clicking scores near zero, and you cannot pause a running trial."
            : "Work in order. Once you move on you cannot return, so answer with your best guess rather than leaving an item blank."}
        </p>
        {section.normEligible ? null : (
          <p className="text-ink">
            On this screen, results from this section are recorded but kept out
            of the reference sample.
          </p>
        )}
      </div>

      {error ? <Problem message={error} /> : null}

      <div className="flex flex-col items-start gap-3">
        <Button type="button" disabled={pending} onClick={onBegin}>
          {pending ? "Starting" : "Begin section"}
        </Button>
        <p className="text-xs text-muted">
          Give it your full attention. Leaving the page while the clock runs
          costs measured time.
        </p>
      </div>
    </Shell>
  );
}

function Completed({ session }: { session: BatterySessionState }) {
  const report = session.report;
  const elapsedMs =
    report?.durationMs ??
    (session.completedAt
      ? new Date(session.completedAt).getTime() -
        new Date(session.startedAt).getTime()
      : 0);

  return (
    <Shell>
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium uppercase tracking-widest text-mark">
          {session.isPracticeMode ? "Practice complete" : "Complete"}
        </span>
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          Raw section totals
        </h1>
        <p className="max-w-xl text-sm leading-6 text-muted">
          You finished in {minutesFromMs(elapsedMs)}. These are the number of
          items you got right, not an IQ: there is no reference sample yet, so a
          percentile or confidence interval would be invented rather than
          measured.
        </p>
      </div>

      <BatteryReportPanel report={report} fallback={session.sections} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href={`/results/battery/${session.id}`}>Open report</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/home">Back to your workspace</Link>
        </Button>
      </div>
    </Shell>
  );
}
