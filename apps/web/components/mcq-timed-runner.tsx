"use client";

import { Button } from "@mindmetric/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiSend } from "../lib/api";
import type { AssessmentSession, ClientMcqItem } from "../lib/assessment-types";

function firstUnansweredIndex(session: AssessmentSession) {
  const index = session.items.findIndex(
    (item) => session.answers[item.id] === undefined,
  );
  return index === -1 ? session.items.length - 1 : index;
}

function isMcqItem(
  item: AssessmentSession["items"][number] | undefined,
): item is ClientMcqItem {
  return item?.type === "mcq";
}

export function McqTimedRunner({ initial }: { initial: AssessmentSession }) {
  const router = useRouter();
  const [session, setSession] = useState(initial);
  const [index, setIndex] = useState(() => firstUnansweredIndex(initial));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const startedAt = useRef(0);
  const saving = useRef(false);
  const persistRef = useRef<
    (
      nextItem: ClientMcqItem,
      value: {
        choiceId: string | null;
        elapsedMs: number;
        timedOut: boolean;
      },
    ) => Promise<AssessmentSession | null>
  >(async () => null);

  const item = session.items[index];
  const last = index === session.items.length - 1;
  const progress = useMemo(() => {
    const answered = session.items.filter(
      (entry) => session.answers[entry.id] !== undefined,
    ).length;
    return `${answered} of ${session.items.length}`;
  }, [session]);

  useEffect(() => {
    if (!isMcqItem(item) || session.answers[item.id] !== undefined) {
      return;
    }
    startedAt.current = Date.now();
    setRemainingMs(item.timeLimitMs);
    saving.current = false;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      const left = item.timeLimitMs - elapsed;
      if (left <= 0) {
        window.clearInterval(timer);
        setRemainingMs(0);
        void persistRef.current(item, {
          choiceId: null,
          elapsedMs: item.timeLimitMs,
          timedOut: true,
        });
        return;
      }
      setRemainingMs(left);
    }, 200);
    return () => window.clearInterval(timer);
  }, [item, session.answers]);

  async function persist(
    nextItem: ClientMcqItem,
    value: { choiceId: string | null; elapsedMs: number; timedOut: boolean },
  ) {
    if (saving.current || session.answers[nextItem.id] !== undefined) {
      return null;
    }
    saving.current = true;
    setPending(true);
    setError(null);
    try {
      const next = await apiSend<AssessmentSession>(
        `/assessments/${session.id}/answers`,
        {
          method: "POST",
          body: JSON.stringify({ itemId: nextItem.id, value }),
        },
      );
      setSession(next);
      if (!last) {
        setIndex((current) => current + 1);
      }
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save.");
      saving.current = false;
      return null;
    } finally {
      setPending(false);
    }
  }
  persistRef.current = persist;

  async function onChoose(choiceId: string) {
    if (!isMcqItem(item)) {
      return;
    }
    await persist(item, {
      choiceId,
      elapsedMs: Date.now() - startedAt.current,
      timedOut: false,
    });
  }

  async function onFinish() {
    if (!isMcqItem(item) || session.answers[item.id] === undefined) {
      setError("Answer or wait for the timer on this item.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await apiSend(`/assessments/${session.id}/complete`, { method: "POST" });
      router.push(`/results/${session.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not finish.");
      setPending(false);
    }
  }

  if (!isMcqItem(item)) {
    return <p className="text-muted">This assessment has no items.</p>;
  }

  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const answered = session.answers[item.id] !== undefined;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex items-start justify-between gap-4">
        <p className="font-serif text-lg font-medium tracking-tight">
          {session.title}
        </p>
        <div className="flex items-center gap-4">
          <p className="text-sm tabular-nums text-muted">{progress}</p>
          <Link
            href="/tests"
            className="text-sm font-medium text-ink underline decoration-line underline-offset-4"
          >
            Exit
          </Link>
        </div>
      </header>
      <div className="flex items-center justify-between gap-4">
        <div className="h-px flex-1 overflow-hidden bg-line">
          <div
            className="h-full bg-accent"
            style={{
              width: `${((index + 1) / session.items.length) * 100}%`,
            }}
          />
        </div>
        <p className="text-sm font-medium tabular-nums text-mark">
          {answered ? "Saved" : `${seconds}s`}
        </p>
      </div>
      <p className="font-serif text-2xl font-medium leading-snug text-ink md:text-[1.75rem]">
        {item.prompt}
      </p>
      <div className="flex flex-col gap-2">
        {item.choices.map((choice, choiceIndex) => (
          <button
            key={choice.id}
            type="button"
            disabled={pending || answered}
            onClick={() => onChoose(choice.id)}
            className="mm-panel flex min-h-12 items-center gap-4 px-4 py-3 text-left text-base text-ink disabled:opacity-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-canvas text-sm font-medium text-muted">
              {String.fromCharCode(65 + choiceIndex)}
            </span>
            {choice.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-auto flex gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={pending || index === 0}
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
        >
          Back
        </Button>
        {last ? (
          <Button type="button" disabled={pending} onClick={onFinish}>
            Finish
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            disabled={pending || !answered}
            onClick={() => setIndex((current) => current + 1)}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
