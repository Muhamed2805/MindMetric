import { FIVE_FACTOR_SLUG } from "./personality";

export const CORE_BATTERY_SLUG = "core-cognitive";

/** Earlier timed puzzle set. New starts go to the core battery. */
export const LEGACY_TIMED_MCQ_SLUG = "quick-pattern-reasoning";

export function isOpenScaleSession(row: { slug: string; status: string }) {
  return row.status === "in_progress" && row.slug !== LEGACY_TIMED_MCQ_SLUG;
}

const BATTERY_SEARCH_CODES = new Set(["gf", "gs", "rq", "gv", "wm"]);

const BATTERY_SEARCH_TERMS = [
  "pilot",
  "rotation",
  "spatial",
  "fluid",
  "matrix",
  "matrices",
  "pattern",
  "processing",
  "quantitative",
  "numerical",
  "working memory",
  "same or different",
  "calibration",
];

/** Assessments search should not swallow domain pilots as a missing test. */
export function queryMatchesBatteryPractice(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return false;
  }
  if (BATTERY_SEARCH_CODES.has(needle)) {
    return true;
  }
  if (/\biq\b/.test(needle)) {
    return true;
  }
  return BATTERY_SEARCH_TERMS.some((term) => needle.includes(term));
}

export function splitListedBatteries<T extends { slug: string }>(rows: T[]) {
  return {
    core: rows.find((row) => row.slug === CORE_BATTERY_SLUG) ?? null,
    practice: rows.filter((row) => row.slug !== CORE_BATTERY_SLUG),
  };
}

export const PRIMARY_SCALE_SLUGS = [
  FIVE_FACTOR_SLUG,
  "work-attention",
  "work-emotion-awareness",
] as const;

export const workspaceNav = [
  { href: "/home", label: "Home" },
  { href: "/tests", label: "Assessments", shortLabel: "Tests" },
  { href: "/battery", label: "Battery" },
  { href: "/personality", label: "Personality", shortLabel: "Traits" },
  { href: "/games", label: "Brain Games", shortLabel: "Games" },
  { href: "/results", label: "Results" },
  { href: "/account", label: "My Profile", shortLabel: "Profile" },
] as const;

export const profileBuckets: Array<{
  id: string;
  label: string;
  slugs: string[];
}> = [
  {
    id: "cognitive",
    label: "Cognitive",
    // Fill is the core battery, not a catalog instrument.
    slugs: [],
  },
  { id: "memory", label: "Memory", slugs: [] },
  { id: "attention", label: "Attention", slugs: ["work-attention"] },
  { id: "personality", label: "Personality", slugs: [FIVE_FACTOR_SLUG] },
  { id: "eq", label: "EQ", slugs: ["work-emotion-awareness"] },
];

/** Memory is Brain Games practice and never a scored profile area. */
export function scoredProfileBuckets() {
  return profileBuckets.filter((bucket) => bucket.id !== "memory");
}

export function profileBucketIsFilled(
  bucket: { id: string; slugs: string[] },
  input: {
    hasBattery: boolean;
    hasPersonality: boolean;
    completedSlugs: Iterable<string>;
  },
) {
  if (bucket.id === "memory") {
    return false;
  }
  if (bucket.id === "cognitive") {
    return input.hasBattery;
  }
  if (bucket.id === "personality") {
    return input.hasPersonality;
  }
  const done = new Set(input.completedSlugs);
  return bucket.slugs.some((slug) => done.has(slug));
}

export function profileCompletion(input: {
  hasBattery: boolean;
  hasPersonality: boolean;
  completedSlugs: Iterable<string>;
}) {
  const scored = scoredProfileBuckets();
  const filled = scored.filter((bucket) =>
    profileBucketIsFilled(bucket, input),
  ).length;
  return {
    filled,
    total: scored.length,
    percent:
      scored.length === 0 ? 0 : Math.round((filled / scored.length) * 100),
  };
}

export function unfinishedProfileBuckets(input: {
  hasBattery: boolean;
  hasPersonality: boolean;
  completedSlugs: Iterable<string>;
}) {
  return scoredProfileBuckets().filter(
    (bucket) => !profileBucketIsFilled(bucket, input),
  );
}

export function profileBucketStartHref(id: string) {
  if (id === "cognitive") {
    return "/battery";
  }
  if (id === "personality") {
    return "/personality";
  }
  if (id === "memory") {
    return "/games";
  }
  if (id === "attention") {
    return "/tests/work-attention";
  }
  if (id === "eq") {
    return "/tests/work-emotion-awareness";
  }
  return "/tests";
}

export function isPrimaryScale(slug: string) {
  return (PRIMARY_SCALE_SLUGS as readonly string[]).includes(slug);
}

export function isHomeRecentAssessment(slug: string) {
  return isPrimaryScale(slug);
}

export function isHomeRecentBattery(slug: string) {
  return slug === CORE_BATTERY_SLUG;
}

export function instrumentHref(slug: string) {
  if (slug === FIVE_FACTOR_SLUG) {
    return "/personality";
  }
  if (slug === LEGACY_TIMED_MCQ_SLUG) {
    return "/battery";
  }
  return `/tests/${slug}`;
}

export function assessmentHref(slug: string) {
  if (slug === CORE_BATTERY_SLUG) {
    return "/battery";
  }
  return instrumentHref(slug);
}

export function recommendedNextSlugs(
  input: {
    hasCoreBattery: boolean;
    catalogSlugs: string[];
    doneSlugs: Iterable<string>;
  },
  limit = 2,
) {
  const done = new Set(input.doneSlugs);
  const next: string[] = [];
  if (!input.hasCoreBattery) {
    next.push(CORE_BATTERY_SLUG);
  }
  for (const slug of input.catalogSlugs) {
    if (next.length >= limit) {
      break;
    }
    if (isPrimaryScale(slug) && !done.has(slug)) {
      next.push(slug);
    }
  }
  return next;
}
