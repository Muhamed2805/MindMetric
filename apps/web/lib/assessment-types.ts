export type LikertAnchor = { value: number; label: string };

export type ClientLikertItem = {
  id: string;
  type: "likert";
  prompt: string;
  scale: { min: number; max: number; anchors: LikertAnchor[] };
};

export type ClientMcqItem = {
  id: string;
  type: "mcq";
  prompt: string;
  choices: { id: string; label: string }[];
  timeLimitMs: number;
};

export type CatalogInstrument = {
  slug: string;
  title: string;
  description: string;
  kind: string;
  versionId: string;
  version: number;
  itemCount: number;
  estimatedSeconds: number;
};

export type InstrumentDetail = CatalogInstrument & {
  items: Array<ClientLikertItem | ClientMcqItem>;
};

export type AssessmentSession = {
  id: string;
  status: "in_progress" | "completed" | string;
  startedAt: string;
  completedAt: string | null;
  title: string;
  slug: string;
  kind: string;
  version: number;
  items: Array<ClientLikertItem | ClientMcqItem>;
  answers: Record<string, unknown>;
  score: AssessmentScore | null;
};

export type CttScore = {
  model: "ctt-v1" | string;
  raw: number;
  min: number;
  max: number;
  pomp: number;
  percentile: number | null;
  band: { id: string; label: string } | null;
  normsKind: "development" | null;
  items: { id: string; keyed: number }[];
  facets?: {
    id: string;
    label: string;
    raw: number;
    min: number;
    max: number;
    pomp: number;
    band: { id: string; label: string } | null;
  }[];
};

export type SumCorrectScore = {
  model: "sum-correct-v1" | string;
  raw: number;
  min: number;
  max: number;
  pomp: number;
  percentile: number | null;
  band: { id: string; label: string } | null;
  normsKind: "development" | null;
  items: {
    id: string;
    correct: boolean;
    timedOut: boolean;
    elapsedMs: number;
  }[];
};

export type AssessmentScore = CttScore | SumCorrectScore;

export type AssessmentSummary = {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  title: string;
  slug: string;
  version: number;
  score: {
    raw: number;
    max: number;
    percentile: number | null;
    band: { id: string; label: string } | null;
  } | null;
};
