import { describe, expect, it } from "vitest";
import { assertNoProhibitedClaims, findProhibitedClaims, REQUIRED_DISCLAIMER } from "@/lib/legal-language";

describe("legal language guardrails", () => {
  it("allows the required disclaimer", () => {
    expect(() => assertNoProhibitedClaims(REQUIRED_DISCLAIMER)).not.toThrow();
  });

  it("detects prohibited legal certainty claims", () => {
    expect(findProhibitedClaims("This name is safe to use and guaranteed unique.")).toEqual([
      "safe to use",
      "guaranteed unique"
    ]);
  });
});

