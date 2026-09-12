import type { ReactNode } from "react";
import { WorkspaceNav } from "./workspace-nav";

export function WorkspaceChrome({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <aside className="hidden w-56 shrink-0 border-r border-line bg-surface md:flex md:flex-col">
        <div className="flex min-h-14 items-center px-4">
          <p className="text-sm font-semibold tracking-tight">MindMetric</p>
        </div>
        <WorkspaceNav variant="side" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 items-center border-b border-line bg-surface px-4 md:hidden">
          <p className="text-sm font-semibold tracking-tight">MindMetric</p>
        </header>
        {/* biome-ignore lint/correctness/useUniqueElementIds: skip-link target */}
        <main
          id="workspace-main"
          className="flex-1 px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-8 md:pb-8"
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
