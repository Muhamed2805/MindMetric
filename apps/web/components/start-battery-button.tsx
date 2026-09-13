"use client";

import { Button } from "@mindmetric/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiSend } from "../lib/api";
import type { BatterySessionState } from "../lib/battery-types";

/**
 * Device and viewport are covariates, not settings: they are measured here and
 * snapshotted on the session so a section's eligibility can be judged later.
 */
function covariates() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return { deviceClass: "unknown", inputMode: "other" };
  }
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (!coarse) {
    return { deviceClass: "desktop", inputMode: "mouse" };
  }
  const shortEdge = Math.min(window.innerWidth, window.innerHeight);
  return {
    deviceClass: shortEdge >= 600 ? "tablet" : "phone",
    inputMode: "touch",
  };
}

export function StartBatteryButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      const session = await apiSend<BatterySessionState>("/battery/sessions", {
        method: "POST",
        body: JSON.stringify({
          batterySlug: slug,
          ...covariates(),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          locale: navigator.language || "en",
        }),
      });
      router.push(`/run/battery/${session.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button type="button" disabled={pending} onClick={onClick}>
        {pending ? "Starting" : "Begin the battery"}
      </Button>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
