import { createHash } from "node:crypto";
import { realProvidersEnabled } from "@/env";
import type { Candidate, ScreeningSourceResult } from "@/lib/types";
import type { ProjectBriefInput } from "@/lib/schemas";
import { mockProviderAdapters } from "@/server/providers/mock";
import { realProviderAdapters } from "@/server/providers/real";
import { normalizeProviderResult } from "@/server/providers/types";
import { getCachedProviderResults, setCachedProviderResults } from "@/server/store";

const cacheTtlMs: Record<string, number> = {
  internal: 60 * 60 * 1000,
  domain: 7 * 24 * 60 * 60 * 1000,
  trademark: 30 * 24 * 60 * 60 * 1000,
  web: 24 * 60 * 60 * 1000,
  social: 24 * 60 * 60 * 1000
};

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function providerCacheKey(candidate: Candidate, brief: ProjectBriefInput, provider: string, sourceMode: "mock" | "real") {
  return stableHash({
    provider,
    sourceMode,
    name: candidate.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    category: brief.category.toLowerCase(),
    geography: brief.geography.toLowerCase(),
    tlds: brief.tlds.map((tld) => tld.toLowerCase()).sort(),
    sensitivity: brief.sensitivity
  });
}

export async function runProviderScreen(candidate: Candidate, brief: ProjectBriefInput, screeningRunId: string, projectId: string) {
  const adapters = realProvidersEnabled ? realProviderAdapters : mockProviderAdapters;
  const results = await Promise.all(
    adapters.map(async (adapter) => {
      const sourceMode = realProvidersEnabled ? "real" : "mock";
      const cacheKey = providerCacheKey(candidate, brief, adapter.provider, sourceMode);
      const cached = await getCachedProviderResults(adapter.provider, adapter.checkType, cacheKey);
      if (cached) return cached;
      const parsedInput = adapter.inputSchema.parse({
        candidate,
        brief,
        sourceMode
      });
      const rows = await adapter.run(parsedInput);
      const normalized = rows.map((row) => normalizeProviderResult(row));
      await setCachedProviderResults(
        adapter.provider,
        adapter.checkType,
        cacheKey,
        stableHash({ provider: adapter.provider, checkType: adapter.checkType, candidate: candidate.name, brief }),
        normalized,
        cacheTtlMs[adapter.checkType] ?? 24 * 60 * 60 * 1000
      );
      return normalized;
    })
  );

  return results.flat().map(
    (result): Omit<ScreeningSourceResult, "id"> => ({
      ...result,
      projectId,
      screeningRunId,
      candidateId: candidate.id
    })
  );
}
