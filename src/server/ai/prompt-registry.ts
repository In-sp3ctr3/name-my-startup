import type { ProjectAccessType } from "@/lib/types";
import type { ProjectBriefInput } from "@/lib/schemas";

export const NAMING_GENERATION_PROMPT_VERSION = "naming-generation-v2";
export const NAMING_GENERATION_SCHEMA_VERSION = "candidate-batch-v2";

const staticNamingInstructions = `
You are Namelift's naming engine. Your job is to produce original startup name candidates, not legal clearance.

Output only JSON matching the supplied schema. Do not include markdown, commentary, or provider/search claims.

Quality rubric:
- Prefer names a founder could actually put on a landing page.
- Names must be pronounceable, memorable, and not overstuffed with AI/product jargon.
- Avoid famous brands, celebrity names, confusing misspellings of existing brands, phishing/security terms, and legal conclusions.
- Do not use availability, clearance, guarantee, or legal-permission language.
- Respect forbidden words exactly and avoid near-obvious variations.
- Required words may be used only if they make the name better.
- Spread candidates across the requested naming lanes.
- Taglines should be short product-positioning lines, not slogans that pretend market validation.
- Rationale should explain brand fit and memorability, not search or trademark evidence.

Scoring rubric:
- strategicFit: fit to product, audience, category, and geography.
- audienceFit: appeal and clarity for the target buyer/user.
- distinctiveness: not generic, not too close to the brief's competitors.
- memorability: easy to remember after one glance.
- pronunciationEase: likely readable aloud.
- spellingEase: likely typeable after hearing it.
- taglineStrength: tagline clarity and usefulness.

Example candidate:
{
  "name": "Harborly",
  "tagline": "Calm planning for independent teams",
  "lane": "invented",
  "rationale": "Harborly suggests a place to gather and organize work while staying soft and memorable.",
  "pronunciation": "HAR-bor-lee",
  "spellingRisk": "low",
  "toneTags": ["calm", "invented"],
  "scores": {
    "strategicFit": 84,
    "audienceFit": 81,
    "distinctiveness": 78,
    "memorability": 86,
    "pronunciationEase": 88,
    "spellingEase": 84,
    "taglineStrength": 80
  }
}
`.trim();

export function modelForAccess(accessType: ProjectAccessType, models: { free: string; paid: string; fallback: string }) {
  if (accessType === "free_preview") return models.free;
  return models.paid || models.fallback;
}

export function buildNamingMessages(input: {
  brief: ProjectBriefInput;
  count: number;
  existingNames: string[];
  accessType: ProjectAccessType;
}) {
  const userContent = [
    `Generate exactly ${input.count} startup name candidates.`,
    `Access tier: ${input.accessType}.`,
    `Brief JSON: ${JSON.stringify(input.brief)}`,
    `Already generated names to avoid: ${JSON.stringify(input.existingNames)}`,
    "Return a balanced set. Do not repeat names. Do not include domain, social, or trademark claims."
  ].join("\n");

  return [
    { role: "system" as const, content: staticNamingInstructions },
    { role: "user" as const, content: userContent }
  ];
}

export function namingJsonSchema(lanes: string[], targetCount: number) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["promptVersion", "candidates"],
    properties: {
      promptVersion: { type: "string", enum: [NAMING_GENERATION_PROMPT_VERSION] },
      candidates: {
        type: "array",
        minItems: targetCount,
        maxItems: 80,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "tagline", "lane", "rationale", "pronunciation", "spellingRisk", "toneTags", "scores"],
          properties: {
            name: { type: "string" },
            tagline: { type: "string" },
            lane: { type: "string", enum: lanes },
            rationale: { type: "string" },
            pronunciation: { type: "string" },
            spellingRisk: { type: "string", enum: ["low", "medium", "high"] },
            toneTags: { type: "array", items: { type: "string" } },
            scores: {
              type: "object",
              additionalProperties: false,
              required: [
                "strategicFit",
                "audienceFit",
                "distinctiveness",
                "memorability",
                "pronunciationEase",
                "spellingEase",
                "taglineStrength"
              ],
              properties: {
                strategicFit: { type: "number" },
                audienceFit: { type: "number" },
                distinctiveness: { type: "number" },
                memorability: { type: "number" },
                pronunciationEase: { type: "number" },
                spellingEase: { type: "number" },
                taglineStrength: { type: "number" }
              }
            }
          }
        }
      }
    }
  };
}
