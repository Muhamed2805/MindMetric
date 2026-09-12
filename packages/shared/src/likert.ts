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

export type LikertDefinition = {
  engine: typeof LIKERT_ENGINE;
  items: LikertItem[];
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
  return value.items.every(isLikertItem);
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

export function isLikertValue(item: Pick<LikertItem, "scale">, value: unknown) {
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
