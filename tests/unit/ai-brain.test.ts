import { describe, expect, it, beforeEach } from "vitest";
import { evaluateCandidateBatch } from "@/server/ai/evals";
import { estimateCostMicroCents, estimateTokens, microCentsToCents } from "@/server/ai/pricing";
import { buildNamingMessages, namingJsonSchema, NAMING_GENERATION_PROMPT_VERSION } from "@/server/ai/prompt-registry";
import { fallbackGenerateCandidates } from "@/server/generation";
import { getCachedProviderResults, resetStoreForTests, setCachedProviderResults } from "@/server/store";
import type { ProjectBriefInput } from "@/lib/schemas";

const brief: ProjectBriefInput = {
  thing: "Invoice Harbor",
  description: "A calm invoice and cashflow planning product for solo consultants.",
  audience: "solo consultants",
  category: "finance operations",
  geography: "United States",
  tone: "calm premium",
  requiredWords: [],
  forbiddenWords: ["bank"],
  competitors: ["QuickBooks"],
  tlds: [".com", ".io"],
  lanes: ["descriptive", "compound", "invented"],
  sensitivity: "standard"
};

describe("AI brain primitives", () => {
  beforeEach(() => resetStoreForTests());

  it("builds a versioned prompt and strict candidate schema", () => {
    const messages = buildNamingMessages({ brief, count: 3, existingNames: ["OldName"], accessType: "free_preview" });
    const schema = namingJsonSchema(brief.lanes, 3);

    expect(messages[0].content).toContain("Namelift's naming engine");
    expect(messages[1].content).toContain("Generate exactly 3");
    expect(JSON.stringify(schema)).toContain(NAMING_GENERATION_PROMPT_VERSION);
    expect(JSON.stringify(schema)).toContain("minItems");
  });

  it("estimates token/cost without rounding tiny calls to zero", () => {
    expect(estimateTokens("abcd")).toBe(1);
    const cost = estimateCostMicroCents("gpt-5.4-mini", 1200, 5000, "openai");

    expect(cost).toBeGreaterThan(0);
    expect(microCentsToCents(cost)).toBeGreaterThanOrEqual(1);
  });

  it("scores generated candidates with eval guardrails", () => {
    const candidates = fallbackGenerateCandidates(brief, 6);
    const result = evaluateCandidateBatch(brief, candidates, 6);

    expect(result.passed, result.violations.join(", ")).toBe(true);
    expect(result.metrics.uniqueNames).toBe(6);
  });

  it("stores and returns provider evidence cache entries", async () => {
    const payload = [
      {
        provider: "test-provider",
        providerVersion: "1",
        checkType: "web" as const,
        label: "no_obvious_conflict_found_in_this_screen" as const,
        confidence: "low" as const,
        source: "test",
        query: "invoice harbor finance operations",
        matchedFields: [],
        summary: "No obvious same-category public signal was found in this screen.",
        freshness: "fixture",
        occurredAt: new Date().toISOString()
      }
    ];

    await setCachedProviderResults("test-provider", "web", "cache-key", "hash", payload, 60_000);
    await expect(getCachedProviderResults("test-provider", "web", "cache-key")).resolves.toEqual(payload);
  });
});
