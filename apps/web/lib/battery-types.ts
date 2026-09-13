import type { PowerStimulus } from "@mindmetric/shared";

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

export type BatteryItem = {
  itemInstanceId: string;
  position: number;
  role: "scored" | "sample";
  shownAt: string | null;
  prompt: string | null;
  stimulus: PowerStimulus;
  choices: BatteryChoice[];
};

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
