import type { CttScore } from "../lib/assessment-types";
import { personalityFacetPercent, personalityPoles } from "../lib/personality";

type Facet = NonNullable<CttScore["facets"]>[number];

export function PersonalityTraitBars({
  facets,
  variant = "compact",
}: {
  facets: Facet[];
  variant?: "compact" | "poles";
}) {
  if (facets.length === 0) {
    return null;
  }

  return (
    <ul
      className={
        variant === "poles" ? "flex flex-col gap-4" : "flex flex-col gap-1"
      }
    >
      {facets.map((facet) => {
        const width = personalityFacetPercent(facet);
        const poles = personalityPoles(facet.id);
        return (
          <li
            key={facet.id}
            className={
              variant === "poles" ? "flex flex-col gap-1.5" : undefined
            }
          >
            {variant === "poles" ? (
              <>
                <p className="text-sm font-medium text-ink">{facet.label}</p>
                {poles ? (
                  <div className="flex justify-between gap-4 text-xs text-muted">
                    <span>{poles.low}</span>
                    <span className="text-right">{poles.high}</span>
                  </div>
                ) : null}
              </>
            ) : (
              <span className="sr-only">
                {facet.label}: {facet.band?.label ?? facet.label}
              </span>
            )}
            <div
              className={
                variant === "poles"
                  ? "h-1.5 overflow-hidden rounded-full bg-line"
                  : "h-1 overflow-hidden rounded-full bg-line"
              }
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
