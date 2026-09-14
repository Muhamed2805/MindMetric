import { Button } from "@mindmetric/ui";
import Link from "next/link";
import { getServerSession } from "../lib/session";
import { BrandMark } from "./brand-mark";

const links = [
  { href: "/#assessments", label: "Assessments" },
  { href: "/battery", label: "Battery" },
  { href: "/personality", label: "Personality" },
  { href: "/#games", label: "Brain Games" },
  { href: "/#method", label: "How It Works" },
];

const gated = new Set(["/battery", "/personality"]);

export async function MarketingHeader() {
  const session = await getServerSession();

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/90 backdrop-blur-sm">
      <div className="mx-auto grid min-h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4">
        <BrandMark href={session ? "/home" : "/"} />
        <nav
          aria-label="Marketing"
          className="hidden items-center gap-7 md:flex"
        >
          {links.map((link) => {
            const href =
              gated.has(link.href) && !session
                ? `/login?from=${link.href}`
                : link.href;
            return (
              <Link
                key={link.href}
                href={href}
                className="text-[13.5px] text-muted hover:text-ink"
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-end gap-4">
          {session ? (
            <Button asChild size="sm">
              <Link href="/home">Workspace</Link>
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-[13.5px] text-muted hover:text-ink sm:inline"
              >
                Log In
              </Link>
              <Button asChild size="sm">
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
