import type { FigureSpec, PowerStimulus } from "@mindmetric/shared";

/** Draft and core batteries shown on /battery and Assessments. */
export const LISTED_BATTERY_SLUGS = [
  "core-cognitive",
  "gs-same-different-pilot",
  "rq-quant-pilot",
] as const;

export type BatteryViewportMinimum = {
  widthPx: number;
  heightPx: number;
};

export type BatteryOverviewSection = {
  position: number;
  domain: string;
  scoredItemCount: number;
  sampleItemCount: number;
  sectionTimeLimitMs: number;
  itemCeilingMs: number;
  minViewport: BatteryViewportMinimum | null;
  normIneligibleDeviceClasses: string[];
};

export type BatteryOverview = {
  slug: string;
  title: string;
  description: string;
  version: number;
  practiceOnly: boolean;
  /** Time under a clock. Instructions and samples run untimed on top. */
  timedMs: number;
  normReferenceDeviceClass: string;
  rulesProvisional: boolean;
  sections: BatteryOverviewSection[];
};

export type BatteryObservation = {
  flag: string;
  severity: string;
  measured: string;
  threshold: string;
};

export type BatterySection = {
  position: number;
  domain: string;
  status: "pending" | "in_progress" | "submitted" | "expired";
  normEligible: boolean;
  ruleVersionId: string | null;
  observations: BatteryObservation[] | null;
  deadlineAt: string | null;
  scoredItemCount: number;
  sampleItemCount: number;
  sectionTimeLimitMs: number;
  completedItemCount: number;
};

export type BatteryChoice = {
  id: string;
  content: PowerStimulus;
};

export type BatteryPowerItem = {
  engine?: "power-mcq-v1";
  itemInstanceId: string;
  position: number;
  role: "scored" | "sample";
  shownAt: string | null;
  prompt: string | null;
  stimulus: PowerStimulus;
  choices: BatteryChoice[];
};

export type BatterySpeedItem = {
  engine: "speed-trial-v1";
  itemInstanceId: string;
  position: number;
  role: "scored" | "sample";
  shownAt: string | null;
  prompt: string;
  k: 2;
  choices: Array<"same" | "different">;
  decisions: Array<{ id: string; left: FigureSpec; right: FigureSpec }>;
};

export type BatteryItem = BatteryPowerItem | BatterySpeedItem;

export function isSpeedBatteryItem(
  item: BatteryItem,
): item is BatterySpeedItem {
  return item.engine === "speed-trial-v1";
}

export type BatteryCurrent = {
  sectionPosition: number;
  domain: string;
  /** Absolute server time the section clock ends; null before it starts. */
  deadlineAt: string | null;
  itemCeilingMs: number;
  sectionTimeLimitMs: number;
  remainingItemCount: number;
  item: BatteryItem | null;
};

export type BatterySessionState = {
  id: string;
  status: string;
  batterySlug: string;
  batteryTitle: string;
  batteryVersion: number;
  isPracticeMode: boolean;
  administrationContext: string;
  attemptNumber: number;
  startedAt: string;
  completedAt: string | null;
  sections: BatterySection[];
  current: BatteryCurrent | null;
  /** Read against the local clock to correct for skew before counting down. */
  serverTime: string;
  /**
   * Null while the session is open: a closed section may already be scored,
   * but the examinee is not shown a total until the battery is finished.
   */
  report: BatteryReport | null;
};

export type BatteryReportSection = {
  domain: string;
  position: number;
  status: string;
  normEligible: boolean;
  raw: number;
  max: number;
  attempted: number;
  accuracyOnAttempted: number | null;
  omitted?: number;
  timedOut?: number;
  notReached?: number;
  observations?: BatteryObservation[];
};

export type BatteryReport = {
  maturity: "S0";
  durationMs: number | null;
  composite: null;
  estimatedIq: null;
  percentile: null;
  interval: null;
  sections: BatteryReportSection[];
};

export type BatterySessionSummary = {
  id: string;
  status: string;
  batterySlug: string;
  batteryTitle: string;
  batteryVersion: number;
  isPracticeMode: boolean;
  attemptNumber: number;
  startedAt: string;
  completedAt: string | null;
  report: BatteryReport | null;
};
