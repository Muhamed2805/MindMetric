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
  facet?: string;
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

export type LikertCttFacet = {
  id: string;
  label: string;
  bands: LikertCttBand[];
};

export type LikertCttScoring = {
  model: "ctt-v1";
  bands: LikertCttBand[];
  norms: {
    kind: "development";
    points: LikertNormPoint[];
  };
  facets?: LikertCttFacet[];
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
  const itemIds = value.items.map((item) => {
    if (!isRecord(item) || typeof item.id !== "string") {
      return "";
    }
    return item.id;
  });
  if (new Set(itemIds).size !== itemIds.length) {
    return false;
  }
  if (value.scoring === undefined) {
    return value.items.every(
      (item) => !isRecord(item) || item.facet === undefined,
    );
  }
  if (!isLikertCttScoring(value.scoring)) {
    return false;
  }
  return facetsAlign(value.items, value.scoring.facets);
}

export function isLikertCttScoring(value: unknown): value is LikertCttScoring {
  if (!isRecord(value) || value.model !== "ctt-v1") {
    return false;
  }
  if (!isMonotonicBands(value.bands)) {
    return false;
  }
  if (!isRecord(value.norms) || value.norms.kind !== "development") {
    return false;
  }
  if (!Array.isArray(value.norms.points) || value.norms.points.length === 0) {
    return false;
  }
  let previousScore = Number.NEGATIVE_INFINITY;
  let previousPercentile = Number.NEGATIVE_INFINITY;
  const pointsOk = value.norms.points.every((point) => {
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
  if (!pointsOk) {
    return false;
  }
  if (value.facets === undefined) {
    return true;
  }
  return isLikertCttFacets(value.facets);
}

function isMonotonicBands(value: unknown): value is LikertCttBand[] {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }
  let previous = Number.NEGATIVE_INFINITY;
  return value.every((band) => {
    if (!isRecord(band)) {
      return false;
    }
    if (typeof band.upTo !== "number" || band.upTo <= previous) {
      return false;
    }
    previous = band.upTo;
    return typeof band.id === "string" && typeof band.label === "string";
  });
}

function isLikertCttFacets(value: unknown): value is LikertCttFacet[] {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }
  const ids = value.map((facet) => {
    if (!isRecord(facet) || typeof facet.id !== "string") {
      return "";
    }
    return facet.id;
  });
  if (ids.some((id) => id.length === 0) || new Set(ids).size !== ids.length) {
    return false;
  }
  return value.every((facet) => {
    if (!isRecord(facet)) {
      return false;
    }
    return (
      typeof facet.id === "string" &&
      typeof facet.label === "string" &&
      isMonotonicBands(facet.bands)
    );
  });
}

function facetsAlign(
  items: unknown[],
  facets: LikertCttFacet[] | undefined,
): boolean {
  if (facets === undefined) {
    return items.every((item) => !isRecord(item) || item.facet === undefined);
  }
  const ids = new Set(facets.map((facet) => facet.id));
  if (
    !items.every(
      (item) =>
        isRecord(item) && typeof item.facet === "string" && ids.has(item.facet),
    )
  ) {
    return false;
  }
  return facets.every((facet) =>
    items.some((item) => isRecord(item) && item.facet === facet.id),
  );
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
  if (value.reverse !== undefined && typeof value.reverse !== "boolean") {
    return false;
  }
  if (value.facet !== undefined) {
    if (typeof value.facet !== "string" || value.facet.length === 0) {
      return false;
    }
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
