import { describe, expect, it } from "vitest";
import { SCREENING_LABELS, isFailureLikeLabel, labelRequiresReview } from "@/lib/screening";
import { screeningReviewWeight } from "@/lib/scoring";

describe("screening labels", () => {
  it("keeps failures from becoming favorable signals", () => {
    expect(isFailureLikeLabel("provider_error")).toBe(true);
    expect(isFailureLikeLabel("source_unavailable")).toBe(true);
    expect(isFailureLikeLabel("inconclusive_result")).toBe(true);
    expect(screeningReviewWeight(["provider_error"])).toBeGreaterThan(0);
  });

  it("has a review posture for every non-neutral label", () => {
    for (const label of SCREENING_LABELS) {
      if (label === "no_obvious_conflict_found_in_this_screen") {
        expect(labelRequiresReview(label)).toBe(false);
      } else {
        expect(labelRequiresReview(label)).toBe(true);
      }
    }
  });
});

