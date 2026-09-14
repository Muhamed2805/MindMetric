"use client";

import { Button } from "@mindmetric/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiSend } from "../lib/api";
import type { AssessmentSession } from "../lib/assessment-types";

export function StartAssessmentButton({
  slug,
  label = "Start this assessment",
}: {
  slug: string;
  label?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      const session = await apiSend<AssessmentSession>("/assessments", {
        method: "POST",
        body: JSON.stringify({ instrumentSlug: slug }),
      });
      router.push(`/run/${session.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button type="button" disabled={pending} onClick={onClick}>
        {pending ? "Starting" : label}
      </Button>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
