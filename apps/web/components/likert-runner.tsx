"use client";

import { Button } from "@mindmetric/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiSend } from "../lib/api";
import type {
  AssessmentSession,
  ClientLikertItem,
} from "../lib/assessment-types";

function firstUnansweredIndex(session: AssessmentSession) {
  const index = session.items.findIndex(
    (item) => session.answers[item.id] === undefined,
  );
  return index === -1 ? session.items.length - 1 : index;
}

export function LikertRunner({ initial }: { initial: AssessmentSession }) {
  const router = useRouter();
  const [session, setSession] = useState(initial);
  const [index, setIndex] = useState(() => firstUnansweredIndex(initial));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const item = session.items[index];
  const selected = item ? session.answers[item.id] : undefined;
  const last = index === session.items.length - 1;
  const progress = useMemo(() => {
    const answered = session.items.filter(
      (entry) => session.answers[entry.id] !== undefined,
    ).length;
    return `${answered} of ${session.items.length}`;
  }, [session]);

  if (!item) {
    return <p className="text-muted">This assessment has no items.</p>;
  }

  const currentItem = item;

  async function persist(nextItem: ClientLikertItem, value: number) {
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
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save.");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function onChoose(value: number) {
    const next = await persist(currentItem, value);
    if (!next) {
      return;
    }
    if (!last) {
      setIndex((current) => current + 1);
    }
  }

  async function onFinish() {
    if (typeof selected !== "number") {
      setError("Choose an answer to finish.");
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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold tracking-tight">{session.title}</p>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted">{progress}</p>
          <Link
            href="/tests"
            className="text-sm font-medium text-ink underline"
          >
            Exit
          </Link>
        </div>
      </header>
      <div className="h-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full bg-accent"
          style={{
            width: `${((index + 1) / session.items.length) * 100}%`,
          }}
        />
      </div>
      <p className="text-xl font-medium leading-8 text-ink md:text-2xl">
        {item.prompt}
      </p>
      <div className="flex flex-col gap-2">
        {item.scale.anchors
          .slice()
          .sort((a, b) => a.value - b.value)
          .map((anchor) => {
            const active = selected === anchor.value;
            return (
              <button
                key={anchor.value}
                type="button"
                disabled={pending}
                onClick={() => onChoose(anchor.value)}
                className={
                  active
                    ? "min-h-12 rounded-md bg-accent px-4 text-left text-base text-accent-fg"
                    : "min-h-12 rounded-md bg-surface px-4 text-left text-base text-ink ring-1 ring-line"
                }
              >
                {anchor.label}
              </button>
            );
          })}
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
            disabled={pending || selected === undefined}
            onClick={() => setIndex((current) => current + 1)}
          >
            Skip ahead
          </Button>
        )}
      </div>
    </div>
  );
}
