import { z } from "zod";
import type { ProviderAdapter, ProviderInput } from "@/server/providers/types";
import type { ProviderResultInput } from "@/lib/schemas";

const providerInputSchema = z.custom<ProviderInput>();

function now() {
  return new Date().toISOString();
}

function hashish(value: string) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

const socialPlatforms = ["x", "instagram", "tiktok", "linkedin", "youtube"] as const;

function confidenceForLabel(label: ProviderResultInput["label"], positiveConfidence: ProviderResultInput["confidence"] = "medium") {
  if (label === "possible_conflict_found") return "high";
  if (label === "source_not_checked" || label === "source_unavailable" || label === "provider_error") return "unknown";
  if (label === "inconclusive_result") return "low";
  return positiveConfidence;
}

export const mockInternalAdapter: ProviderAdapter = {
  provider: "mock-internal-quality",
  version: "1.0.0",
  checkType: "internal",
  inputSchema: providerInputSchema,
  async run({ candidate, brief }) {
    const competitorHit = brief.competitors.find((competitor) =>
      candidate.name.toLowerCase().includes(competitor.toLowerCase().slice(0, 4))
    );
    const label = competitorHit ? "possible_conflict_found" : "no_obvious_conflict_found_in_this_screen";
    return [
      {
        provider: this.provider,
        providerVersion: this.version,
        checkType: this.checkType,
        label,
        source: "internal quality screen",
        query: candidate.name,
        jurisdiction: brief.geography,
        matchedFields: competitorHit ? ["competitor input"] : [],
        summary: competitorHit
          ? "Candidate resembles a competitor input and requires human/legal review."
          : "No obvious internal quality issue was found in this screen.",
        confidence: confidenceForLabel(label, "medium"),
        freshness: "current-run",
        occurredAt: now()
      }
    ];
  }
};

export const mockDomainAdapter: ProviderAdapter = {
  provider: "mock-domain-signals",
  version: "1.0.0",
  checkType: "domain",
  inputSchema: providerInputSchema,
  async run({ candidate, brief }) {
    return brief.tlds.slice(0, 4).map((tld, index) => {
      const bucket = (hashish(candidate.name + tld) + index) % 9;
      const label =
        bucket === 0
          ? "possible_conflict_found"
          : bucket === 1
            ? "source_unavailable"
            : bucket === 2
              ? "provider_error"
              : bucket === 3
                ? "inconclusive_result"
                : "no_obvious_conflict_found_in_this_screen";
      return {
        provider: this.provider,
        providerVersion: this.version,
        checkType: this.checkType,
        label,
        source: "mock RDAP/registrar adapter",
        query: `${candidate.name.toLowerCase()}${tld}`,
        jurisdiction: "global",
        matchedFields: label === "possible_conflict_found" ? ["domain registration signal"] : [],
        summary:
          label === "no_obvious_conflict_found_in_this_screen"
            ? "No obvious domain registration signal was found in this screen."
            : "Domain registration signal requires review before any purchase or launch decision.",
        confidence: confidenceForLabel(label, "medium"),
        freshness: "mock-fixture",
        occurredAt: now()
      };
    });
  }
};

export const mockTrademarkAdapter: ProviderAdapter = {
  provider: "mock-trademark-public-records",
  version: "1.0.0",
  checkType: "trademark",
  inputSchema: providerInputSchema,
  async run({ candidate, brief }) {
    const risky = hashish(candidate.name) % 5 === 0;
    return [
      {
        provider: this.provider,
        providerVersion: this.version,
        checkType: this.checkType,
        label: risky ? "possible_conflict_found" : "no_obvious_conflict_found_in_this_screen",
        source: "mock USPTO/public-record screen",
        query: candidate.name,
        jurisdiction: brief.geography,
        matchedFields: risky ? ["similar word mark", "related goods/services"] : [],
        summary: risky
          ? "A similar public-record signal was found and requires human/legal review."
          : "No obvious public-record signal was found in this screen.",
        confidence: confidenceForLabel(risky ? "possible_conflict_found" : "no_obvious_conflict_found_in_this_screen", "medium"),
        freshness: "mock-fixture",
        occurredAt: now()
      }
    ];
  }
};

export const mockWebAdapter: ProviderAdapter = {
  provider: "mock-web-category-signals",
  version: "1.0.0",
  checkType: "web",
  inputSchema: providerInputSchema,
  async run({ candidate, brief }) {
    const bucket = hashish(`${candidate.name}:${brief.category}`) % 7;
    const label = bucket === 0 ? "inconclusive_result" : bucket === 1 ? "possible_conflict_found" : "no_obvious_conflict_found_in_this_screen";
    return [
      {
        provider: this.provider,
        providerVersion: this.version,
        checkType: this.checkType,
        label,
        source: "mock search/category adapter",
        query: `${candidate.name} ${brief.category}`,
        jurisdiction: brief.geography,
        matchedFields: label === "possible_conflict_found" ? ["same-category search signal"] : [],
        summary:
          label === "possible_conflict_found"
            ? "A same-category public signal was detected and requires human/legal review."
            : label === "inconclusive_result"
              ? "Search/category evidence was ambiguous in this screen."
              : "No obvious same-category public signal was found in this screen.",
        confidence: confidenceForLabel(label, "low"),
        freshness: "mock-fixture",
        occurredAt: now()
      }
    ];
  }
};

export const mockSocialAdapter: ProviderAdapter = {
  provider: "mock-social-signals",
  version: "1.0.0",
  checkType: "social",
  inputSchema: providerInputSchema,
  async run({ candidate }) {
    const handle = candidate.name.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 28) || "name";
    return socialPlatforms.map((platform) => {
      const bucket = hashish(`${candidate.name}:${platform}`) % 7;
      const label =
        bucket === 0
          ? "possible_conflict_found"
          : bucket === 1
            ? "inconclusive_result"
            : "no_obvious_conflict_found_in_this_screen";
      return {
        provider: this.provider,
        providerVersion: this.version,
        checkType: this.checkType,
        label,
        source: `mock ${platform} public profile`,
        query: `${platform} @${handle}`,
        matchedFields: label === "possible_conflict_found" ? [`${platform} handle signal`] : [],
        summary:
          label === "no_obvious_conflict_found_in_this_screen"
            ? `No obvious ${platform} handle signal was found in this screen.`
            : `The ${platform} handle signal requires review before launch.`,
        confidence: confidenceForLabel(label, "low"),
        freshness: "mock-fixture",
        occurredAt: now()
      };
    });
  }
};

export const mockProviderAdapters = [
  mockInternalAdapter,
  mockDomainAdapter,
  mockTrademarkAdapter,
  mockWebAdapter,
  mockSocialAdapter
];
