export const SCREENING_LABELS = [
  "possible_conflict_found",
  "no_obvious_conflict_found_in_this_screen",
  "requires_human_legal_review",
  "source_unavailable",
  "source_not_checked",
  "provider_error",
  "inconclusive_result"
] as const;

export type ScreeningLabel = (typeof SCREENING_LABELS)[number];

export const SCREENING_LABEL_COPY: Record<ScreeningLabel, string> = {
  possible_conflict_found: "Possible conflict found",
  no_obvious_conflict_found_in_this_screen: "No obvious conflict found in this screen",
  requires_human_legal_review: "Requires human/legal review",
  source_unavailable: "Source unavailable",
  source_not_checked: "Source not checked",
  provider_error: "Provider error",
  inconclusive_result: "Inconclusive result"
};

export const SCREENING_LABEL_TONE: Record<ScreeningLabel, "neutral" | "attention" | "caution" | "muted"> = {
  possible_conflict_found: "attention",
  no_obvious_conflict_found_in_this_screen: "neutral",
  requires_human_legal_review: "caution",
  source_unavailable: "muted",
  source_not_checked: "muted",
  provider_error: "caution",
  inconclusive_result: "caution"
};

export function isFailureLikeLabel(label: ScreeningLabel) {
  return label === "source_unavailable" || label === "provider_error" || label === "inconclusive_result";
}

export function labelRequiresReview(label: ScreeningLabel) {
  return label !== "no_obvious_conflict_found_in_this_screen";
}

