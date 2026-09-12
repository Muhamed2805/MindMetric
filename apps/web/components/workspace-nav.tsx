"use client";

import { cn } from "@mindmetric/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { workspaceNav } from "../lib/workspace-nav";

export function WorkspaceNav({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Workspace"
      className={
        variant === "side"
          ? "flex flex-col gap-1 p-3"
          : "grid grid-cols-4 gap-1 px-2 pt-1"
      }
    >
      {workspaceNav.map((item) => {
        const current =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium",
              variant === "side" && "justify-start",
              current
                ? "bg-canvas text-ink"
                : "text-muted hover:bg-canvas hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
