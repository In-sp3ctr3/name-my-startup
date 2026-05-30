export const REQUIRED_DISCLAIMER =
  "Automated screening result only. This is not a legal availability determination and does not replace review by qualified trademark counsel.";

export const APPROVED_SCREENING_TERMS = [
  "Screening result",
  "Possible conflict found",
  "No obvious conflict found in this screen",
  "Requires human/legal review",
  "Public signal detected",
  "Source unavailable",
  "Source not checked",
  "Provider error",
  "Inconclusive result",
  "Registration signal",
  "Automated screening only"
] as const;

export const PROHIBITED_LEGAL_CLAIMS = [
  "legally available",
  "trademark clear",
  "cleared",
  "safe to use",
  "no conflicts",
  "guaranteed unique",
  "approved",
  "protected",
  "registrable",
  "enforceable"
] as const;

export function findProhibitedClaims(text: string) {
  const normalized = text.toLowerCase();
  return PROHIBITED_LEGAL_CLAIMS.filter((claim) => normalized.includes(claim));
}

export function assertNoProhibitedClaims(text: string) {
  const matches = findProhibitedClaims(text);
  if (matches.length > 0) {
    throw new Error(`Prohibited legal certainty language found: ${matches.join(", ")}`);
  }
}

