export const API_VERSION = "v1" as const;

export {
  allItemsAnswered,
  type ClientLikertItem,
  isLikertCttScoring,
  isLikertDefinition,
  isLikertValue,
  LIKERT_ENGINE,
  type LikertCttBand,
  type LikertCttScoring,
  type LikertDefinition,
  type LikertItem,
  type LikertNormPoint,
  toClientLikertItem,
} from "./likert";
