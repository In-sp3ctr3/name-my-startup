import type { ProjectBriefInput } from "@/lib/schemas";

const famousBrands = ["google", "apple", "microsoft", "amazon", "meta", "openai", "tesla", "stripe"];
const phishingTerms = ["login", "wallet", "verify", "password", "bank", "support"];
const confusables = /[\u0430-\u044f\u0391-\u03c9\uFF00-\uFFEF]/i;

export function findAbuseSignals(value: string) {
  const normalized = value.toLowerCase();
  const signals: string[] = [];
  if (famousBrands.some((brand) => normalized.includes(brand))) {
    signals.push("famous-brand-lookalike");
  }
  if (phishingTerms.some((term) => normalized.includes(term))) {
    signals.push("phishing-sensitive-term");
  }
  if (confusables.test(value)) {
    signals.push("unicode-confusable");
  }
  return signals;
}

export function briefHasStrictExternalRouting(brief: ProjectBriefInput) {
  return brief.sensitivity === "strict";
}

