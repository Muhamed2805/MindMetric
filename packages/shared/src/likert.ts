export const LIKERT_ENGINE = "likert-v1" as const;

export type LikertAnchor = {
  value: number;
  label: string;
};

export type LikertScale = {
  min: number;
  max: number;
  anchors: LikertAnchor[];
};

export type LikertItem = {
  id: string;
  type: "likert";
  prompt: string;
  reverse?: boolean;
  scale: LikertScale;
};

export type LikertCttBand = {
  upTo: number;
  id: string;
  label: string;
};

export type LikertNormPoint = {
  score: number;
  percentile: number;
};

export type LikertCttScoring = {
  model: "ctt-v1";
  bands: LikertCttBand[];
  norms: {
    kind: "development";
    points: LikertNormPoint[];
  };
};

export type LikertDefinition = {
  engine: typeof LIKERT_ENGINE;
  items: LikertItem[];
  scoring?: LikertCttScoring;
};

export type ClientLikertItem = Omit<LikertItem, "reverse">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isLikertDefinition(value: unknown): value is LikertDefinition {
  if (!isRecord(value) || value.engine !== LIKERT_ENGINE) {
    return false;
  }
  if (!Array.isArray(value.items) || value.items.length === 0) {
    return false;
  }
  if (!value.items.every(isLikertItem)) {
    return false;
  }
  if (value.scoring === undefined) {
    return true;
  }
  return isLikertCttScoring(value.scoring);
}

export function isLikertCttScoring(value: unknown): value is LikertCttScoring {
  if (!isRecord(value) || value.model !== "ctt-v1") {
    return false;
  }
  if (!Array.isArray(value.bands) || value.bands.length === 0) {
    return false;
  }
  let previous = Number.NEGATIVE_INFINITY;
  const bandsOk = value.bands.every((band) => {
    if (!isRecord(band)) {
      return false;
    }
    if (typeof band.upTo !== "number" || band.upTo <= previous) {
      return false;
    }
    previous = band.upTo;
    return typeof band.id === "string" && typeof band.label === "string";
  });
  if (
    !bandsOk ||
    !isRecord(value.norms) ||
    value.norms.kind !== "development"
  ) {
    return false;
  }
  if (!Array.isArray(value.norms.points) || value.norms.points.length === 0) {
    return false;
  }
  let previousScore = Number.NEGATIVE_INFINITY;
  let previousPercentile = Number.NEGATIVE_INFINITY;
  return value.norms.points.every((point) => {
    if (!isRecord(point)) {
      return false;
    }
    if (
      typeof point.score !== "number" ||
      typeof point.percentile !== "number"
    ) {
      return false;
    }
    if (point.score <= previousScore || point.percentile < previousPercentile) {
      return false;
    }
    if (point.percentile < 0 || point.percentile > 100) {
      return false;
    }
    previousScore = point.score;
    previousPercentile = point.percentile;
    return true;
  });
}

function isLikertItem(value: unknown): value is LikertItem {
  if (!isRecord(value)) {
    return false;
  }
  if (value.type !== "likert" || typeof value.id !== "string") {
    return false;
  }
  if (typeof value.prompt !== "string" || value.prompt.length === 0) {
    return false;
  }
  return isLikertScale(value.scale);
}

function isLikertScale(value: unknown): value is LikertScale {
  if (!isRecord(value)) {
    return false;
  }
  const min = value.min;
  const max = value.max;
  if (typeof min !== "number" || typeof max !== "number") {
    return false;
  }
  if (min >= max) {
    return false;
  }
  if (!Array.isArray(value.anchors) || value.anchors.length === 0) {
    return false;
  }
  return value.anchors.every((anchor) => {
    if (!isRecord(anchor)) {
      return false;
    }
    return (
      typeof anchor.value === "number" &&
      anchor.value >= min &&
      anchor.value <= max &&
      typeof anchor.label === "string"
    );
  });
}

export function isLikertValue(
  item: Pick<LikertItem, "scale">,
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= item.scale.min &&
    value <= item.scale.max
  );
}

export function toClientLikertItem(item: LikertItem): ClientLikertItem {
  return {
    id: item.id,
    type: item.type,
    prompt: item.prompt,
    scale: item.scale,
  };
}

export function allItemsAnswered(
  itemIds: string[],
  answeredIds: Iterable<string>,
) {
  const set = new Set(answeredIds);
  return itemIds.every((id) => set.has(id));
}
