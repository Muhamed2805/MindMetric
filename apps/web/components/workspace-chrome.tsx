import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "./sign-out-button";
import { WorkspaceNav } from "./workspace-nav";
import { WorkspaceTopbar } from "./workspace-topbar";

export function WorkspaceChrome({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="hidden w-[15.5rem] shrink-0 border-r border-line bg-surface md:flex md:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-fg">
            M
          </span>
          <Link
            href="/home"
            className="text-[15px] font-semibold tracking-tight"
          >
            MindMetric
          </Link>
        </div>
        <WorkspaceNav variant="side" />
        <div className="mt-auto border-t border-line px-3 py-4">
          <Link
            href="/#method"
            className="flex min-h-10 items-center rounded-lg px-3 text-[13.5px] text-muted hover:text-ink"
          >
            Methodology
          </Link>
          <div className="px-3 pt-1">
            <SignOutButton />
          </div>
          <p className="px-3 pt-3 text-[11px] leading-4 text-mark">
            Evidence-informed · Private by design
          </p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <header className="flex min-h-14 items-center gap-2 border-b border-line bg-surface px-4 md:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-fg">
            M
          </span>
          <p className="text-[15px] font-semibold">MindMetric</p>
        </header>
        <WorkspaceTopbar />
        {/* biome-ignore lint/correctness/useUniqueElementIds: skip-link target */}
        <main
          id="workspace-main"
          className="flex-1 px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-10"
        >
          {children}
        </main>
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <WorkspaceNav variant="bottom" />
      </div>
    </div>
  );
}
