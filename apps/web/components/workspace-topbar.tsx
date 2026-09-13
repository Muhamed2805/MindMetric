"use client";

import { usePathname } from "next/navigation";

const crumbs: Record<string, string> = {
  "/home": "Home",
  "/tests": "Assessments",
  "/games": "Brain Games",
  "/results": "Results",
  "/account": "My Profile",
};

export function WorkspaceTopbar() {
  const pathname = usePathname();
  const key = Object.keys(crumbs)
    .sort((a, b) => b.length - a.length)
    .find((href) => pathname === href || pathname.startsWith(`${href}/`));
  const label = key ? crumbs[key] : "Home";

  return (
    <div className="hidden items-center gap-4 border-b border-line bg-surface/80 px-6 py-3 md:flex">
      <p className="text-xs text-muted">Dashboard / {label}</p>
      <form action="/tests" className="ml-auto block w-64">
        <label className="block">
          <span className="sr-only">Search assessments</span>
          <input
            name="q"
            placeholder="Search MindMetric"
            className="h-9 w-full rounded-full bg-canvas px-4 text-sm text-ink outline-none ring-1 ring-line placeholder:text-mark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>
      </form>
    </div>
  );
}
