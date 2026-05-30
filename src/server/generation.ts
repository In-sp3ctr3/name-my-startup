import { env } from "@/env";
import { assertNoProhibitedClaims } from "@/lib/legal-language";
import { PRODUCT_OFFER } from "@/lib/product-offer";
import { generationOutputSchema, type CandidateInput, type NamingLane, type ProjectBriefInput } from "@/lib/schemas";
import type { DimensionalScores } from "@/lib/scoring";
import { clampScore } from "@/lib/scoring";
import type { ProjectAccessType } from "@/lib/types";
import { evaluateCandidateBatch, type NamingEvalResult } from "@/server/ai/evals";
import { estimateStructuredJsonRequestCost, requestStructuredJson, type StructuredJsonResult } from "@/server/ai/model-gateway";
import { microCentsToCents, estimatedOutputTokensForNames } from "@/server/ai/pricing";
import {
  buildNamingMessages,
  modelForAccess,
  namingJsonSchema,
  NAMING_GENERATION_PROMPT_VERSION,
  NAMING_GENERATION_SCHEMA_VERSION
} from "@/server/ai/prompt-registry";

export const GENERATION_PROMPT_VERSION = NAMING_GENERATION_PROMPT_VERSION;
export const GENERATION_SCHEMA_VERSION = NAMING_GENERATION_SCHEMA_VERSION;

const laneStems: Record<string, string[]> = {
  descriptive: ["Signal", "Pilot", "Foundry", "Bench", "Field"],
  compound: ["North", "Kindle", "Bright", "Forge", "Pulse"],
  invented: ["Nuvia", "Kindo", "Velora", "Savia", "Orami"],
  metaphorical: ["Harbor", "Canopy", "Atlas", "Beacon", "Trellis"],
  technical: ["Vector", "Kernel", "Relay", "Stack", "Mesh"],
  premium: ["Crown", "Forma", "Aster", "Noble", "Verve"],
  playful: ["Pop", "Jolt", "Sprout", "Fizz", "Wink"],
  minimal: ["Mono", "Line", "Core", "Lift", "Nest"]
};

function score(seed: number, offset: number) {
  return clampScore(62 + ((seed * 17 + offset * 11) % 33));
}

function buildScores(seed: number): DimensionalScores {
  return {
    strategicFit: score(seed, 1),
    audienceFit: score(seed, 2),
    distinctiveness: score(seed, 3),
    memorability: score(seed, 4),
    pronunciationEase: score(seed, 5),
    spellingEase: score(seed, 6),
    taglineStrength: score(seed, 7)
  };
}

function cleanToken(value: string) {
  return value
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .find((part) => part.length > 2)
    ?.replace(/^\w/, (char) => char.toUpperCase()) ?? "Venture";
}

export function fallbackGenerateCandidates(brief: ProjectBriefInput, count: number = PRODUCT_OFFER.freeNameCount, offset = 0): CandidateInput[] {
  const categoryToken = cleanToken(brief.category);
  const audienceToken = cleanToken(brief.audience);
  const lanes: NamingLane[] = brief.lanes.length > 0 ? brief.lanes : ["descriptive", "compound", "invented", "metaphorical"];
  const candidates: CandidateInput[] = [];

  for (let index = offset; candidates.length < count; index += 1) {
    const lane = lanes[index % lanes.length];
    const stems = laneStems[lane] ?? laneStems.descriptive;
    const laneTurn = Math.floor(index / lanes.length);
    const stem = stems[laneTurn % stems.length];
    const variant = Math.floor(laneTurn / stems.length);
    const suffix = variant > 0 ? String(variant + 1) : "";
    const name =
      lane === "invented"
        ? `${stem}${categoryToken.slice(0, 2)}${suffix}`
        : lane === "minimal"
          ? `${stem}${suffix}`
          : `${stem}${variant > 0 ? `${categoryToken}${suffix}` : audienceToken}`;

    const candidate: CandidateInput = {
      name,
      tagline: `${brief.thing} naming for ${brief.audience.toLowerCase()}`,
      lane,
      rationale: `${name} matches the ${brief.tone.toLowerCase()} tone while staying easy to compare against public-source screening labels.`,
      pronunciation: name.split("").join("-").replace(/-/g, "").toLowerCase(),
      spellingRisk: lane === "invented" ? "medium" : "low",
      toneTags: [brief.tone.split(/[,\s]+/)[0]?.toLowerCase() || "focused", lane],
      scores: buildScores(index + name.length)
    };

    const text = `${candidate.name} ${candidate.tagline} ${candidate.rationale}`;
    if (brief.forbiddenWords.some((word) => text.toLowerCase().includes(word.toLowerCase()))) {
      continue;
    }
    if (candidates.some((item) => item.name.toLowerCase() === candidate.name.toLowerCase())) {
      continue;
    }
    candidates.push(candidate);
  }

  return candidates;
}

export function generationModelForAccess(accessType: ProjectAccessType) {
  return modelForAccess(accessType, {
    free: env.OPENAI_NAMING_FREE_MODEL,
    paid: env.OPENAI_NAMING_PAID_MODEL,
    fallback: env.OPENAI_NAMING_MODEL
  });
}

export function estimateGenerationCost(brief: ProjectBriefInput, count: number, existingNames: string[], accessType: ProjectAccessType) {
  const targetCount = Math.min(80, Math.max(1, Math.round(count)));
  const messages = buildNamingMessages({ brief, count: targetCount, existingNames, accessType });
  return estimateStructuredJsonRequestCost({ messages, model: generationModelForAccess(accessType), count: targetCount });
}

export async function generateCandidates(
  brief: ProjectBriefInput,
  count: number = PRODUCT_OFFER.freeNameCount,
  existingNames: string[] = [],
  options: { accessType?: ProjectAccessType } = {}
) {
  const targetCount = Math.min(80, Math.max(1, Math.round(count)));
  const accessType = options.accessType ?? "free_preview";
  const existingNameSet = new Set(existingNames.map((name) => name.toLowerCase()));
  const model = generationModelForAccess(accessType);
  const messages = buildNamingMessages({ brief, count: targetCount, existingNames, accessType });

  try {
    const response: StructuredJsonResult = await requestStructuredJson({
      task: "naming_generation",
      model,
      promptVersion: GENERATION_PROMPT_VERSION,
      messages,
      schemaName: "candidate_batch",
      schema: namingJsonSchema(brief.lanes, targetCount),
      maxOutputTokens: estimatedOutputTokensForNames(targetCount) + 1200
    });

    const outputText = response.outputText;
    const parsed = generationOutputSchema.parse(JSON.parse(outputText));
    const deduped: CandidateInput[] = [];
    for (const candidate of parsed.candidates) {
      assertNoProhibitedClaims(`${candidate.name} ${candidate.tagline} ${candidate.rationale}`);
      const key = candidate.name.toLowerCase();
      if (existingNameSet.has(key) || deduped.some((item) => item.name.toLowerCase() === key)) continue;
      deduped.push(candidate);
    }
    if (deduped.length < targetCount) {
      const topUps = fallbackGenerateCandidates(brief, targetCount, existingNames.length + deduped.length).filter((candidate) => {
        const key = candidate.name.toLowerCase();
        return !existingNameSet.has(key) && !deduped.some((item) => item.name.toLowerCase() === key);
      });
      deduped.push(...topUps);
    }
    const candidates = deduped.slice(0, targetCount);
    const evalResult = evaluateCandidateBatch(brief, candidates, targetCount);
    if (!evalResult.passed) throw new Error(`Naming eval failed: ${evalResult.violations.join(", ")}`);
    return {
      candidates,
      validationStatus: "valid" as const,
      costEstimateCents: microCentsToCents(response.estimatedCostMicroCents),
      aiUsage: {
        provider: response.provider,
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        estimatedCostMicroCents: response.estimatedCostMicroCents,
        status: "succeeded" as const
      },
      evalResult
    };
  } catch {
    const candidates = fallbackGenerateCandidates(brief, targetCount, existingNames.length);
    const evalResult: NamingEvalResult = evaluateCandidateBatch(brief, candidates, targetCount);
    return {
      candidates,
      validationStatus: "fallback" as const,
      costEstimateCents: 0,
      aiUsage: {
        provider: "fixture" as const,
        model: "deterministic-fixture",
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostMicroCents: 0,
        status: "fallback" as const
      },
      evalResult
    };
  }
}
