export type CatalogInstrument = {
  slug: string;
  title: string;
  description: string;
  kind: string;
  versionId: string;
  version: number;
};

export type InstrumentDetail = CatalogInstrument & {
  itemCount: number;
};

export type LikertAnchor = { value: number; label: string };

export type ClientLikertItem = {
  id: string;
  type: "likert";
  prompt: string;
  scale: { min: number; max: number; anchors: LikertAnchor[] };
};

export type AssessmentSession = {
  id: string;
  status: "in_progress" | "completed" | string;
  startedAt: string;
  completedAt: string | null;
  title: string;
  slug: string;
  version: number;
  items: ClientLikertItem[];
  answers: Record<string, unknown>;
};

export type AssessmentSummary = {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  title: string;
  slug: string;
  version: number;
};
