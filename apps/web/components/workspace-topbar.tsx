"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const crumbs: Record<string, string> = {
  "/home": "Home",
  "/tests": "Assessments",
  "/battery": "Battery",
  "/personality": "Personality",
  "/games": "Brain Games",
  "/results": "Results",
  "/account": "My Profile",
};

function AssessmentSearchForm({ query }: { query: string }) {
  return (
    <form action="/tests" className="ml-auto block w-64">
      <label className="block">
        <span className="sr-only">Search assessments</span>
        <input
          key={query}
          name="q"
          defaultValue={query}
          placeholder="Search MindMetric"
          className="h-9 w-full rounded-full bg-canvas px-4 text-sm text-ink outline-none ring-1 ring-line placeholder:text-mark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>
    </form>
  );
}

function AssessmentSearchField() {
  return <AssessmentSearchForm query={useSearchParams().get("q") ?? ""} />;
}

export function WorkspaceTopbar() {
  const pathname = usePathname();
  const key = Object.keys(crumbs)
    .sort((a, b) => b.length - a.length)
    .find((href) => pathname === href || pathname.startsWith(`${href}/`));
  const label = key ? crumbs[key] : "Home";

  return (
    <div className="hidden items-center gap-4 border-b border-line bg-surface/80 px-6 py-3 md:flex">
      <p className="text-xs text-muted">Dashboard / {label}</p>
      <Suspense fallback={<AssessmentSearchForm query="" />}>
        <AssessmentSearchField />
      </Suspense>
    </div>
  );
}
