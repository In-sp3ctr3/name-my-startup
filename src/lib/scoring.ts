import type { ScreeningLabel } from "@/lib/screening";
import { isFailureLikeLabel, labelRequiresReview } from "@/lib/screening";

export type ScoreDimension =
  | "strategicFit"
  | "audienceFit"
  | "distinctiveness"
  | "memorability"
  | "pronunciationEase"
  | "spellingEase"
  | "taglineStrength";

export type DimensionalScores = Record<ScoreDimension, number>;

export const SCORE_DIMENSIONS: ScoreDimension[] = [
  "strategicFit",
  "audienceFit",
  "distinctiveness",
  "memorability",
  "pronunciationEase",
  "spellingEase",
  "taglineStrength"
];

export function clampScore(value: number) {
  if (Number.isNaN(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function screeningReviewWeight(labels: ScreeningLabel[]) {
  if (labels.length === 0) return 0;
  return labels.reduce((weight, label) => {
    if (label === "possible_conflict_found") return weight + 30;
    if (label === "requires_human_legal_review") return weight + 22;
    if (isFailureLikeLabel(label)) return weight + 16;
    if (labelRequiresReview(label)) return weight + 8;
    return weight;
  }, 0);
}

export function averageScores(scores: DimensionalScores) {
  return clampScore(SCORE_DIMENSIONS.reduce((total, key) => total + scores[key], 0) / SCORE_DIMENSIONS.length);
}

