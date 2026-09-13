import Link from "next/link";

function Spark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M12 2.2 13.7 9l6.8 1.3-5.2 4.6 1.5 6.9L12 18.2 7.2 21.8l1.5-6.9-5.2-4.6L10.3 9 12 2.2Z" />
    </svg>
  );
}

export function BrandMark({
  href,
  invert = false,
}: {
  href: string;
  invert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        invert
          ? "inline-flex items-center gap-2.5 text-sidebar-fg"
          : "inline-flex items-center gap-2.5 text-ink"
      }
    >
      <span
        className={
          invert
            ? "flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-fg text-sidebar"
            : "flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg"
        }
      >
        <Spark className="h-3.5 w-3.5" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        MindMetric
      </span>
    </Link>
  );
}
