import Link from "next/link";
import { getServerSession } from "../lib/session";
import { BrandMark } from "./brand-mark";

const links = [
  { href: "/#assessments", label: "Assessments" },
  { href: "/battery", label: "Battery" },
  { href: "/personality", label: "Personality" },
  { href: "/#games", label: "Brain Games" },
  { href: "/#method", label: "Methodology" },
];

const gated = new Set(["/battery", "/personality"]);

export async function MarketingFooter() {
  const session = await getServerSession();

  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <BrandMark href="/" />
        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-mark"
        >
          {links.map((link) => {
            const href =
              gated.has(link.href) && !session
                ? `/login?from=${link.href}`
                : link.href;
            return (
              <Link key={link.href} href={href}>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <p className="text-[13px] text-mark">© 2026 MindMetric</p>
      </div>
    </footer>
  );
}
