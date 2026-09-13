"use client";

import { cn } from "@mindmetric/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { workspaceNav } from "../lib/workspace-nav";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      {children}
    </svg>
  );
}

function NavIcon({ name }: { name: string }) {
  if (name === "Home") {
    return (
      <Icon>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </Icon>
    );
  }
  if (name === "Assessments") {
    return (
      <Icon>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 9h8M8 13h5" />
      </Icon>
    );
  }
  if (name === "Brain Games") {
    return (
      <Icon>
        <path d="M8 8a4 4 0 0 1 8 0c2 1 3 3 3 5.5S17 19 12 19 5 16.5 5 13.5 6 9 8 8z" />
      </Icon>
    );
  }
  if (name === "Results") {
    return (
      <Icon>
        <path d="M5 19V9m7 10V5m7 14v-7" />
      </Icon>
    );
  }
  return (
    <Icon>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c1.2-3.2 3.6-5 7-5s5.8 1.8 7 5" />
    </Icon>
  );
}

export function WorkspaceNav({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Workspace"
      className={
        variant === "side"
          ? "flex flex-col gap-0.5 px-3"
          : "grid grid-cols-5 gap-0 px-1 pt-1"
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
              "flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-[13.5px]",
              variant === "bottom" &&
                "flex-col justify-center gap-0.5 px-1 text-[11px]",
              current
                ? "bg-[#e8eef2] font-medium text-ink"
                : "text-muted hover:bg-canvas hover:text-ink",
            )}
          >
            <NavIcon name={item.label} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
