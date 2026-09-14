import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function MarketingFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <BrandMark href="/" />
        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-mark"
        >
          <Link href="/#assessments">Assessments</Link>
          <Link href="/battery">Battery</Link>
          <Link href="/personality">Personality</Link>
          <Link href="/#games">Brain Games</Link>
          <Link href="/#method">Methodology</Link>
        </nav>
        <p className="text-[13px] text-mark">© 2026 MindMetric</p>
      </div>
    </footer>
  );
}
