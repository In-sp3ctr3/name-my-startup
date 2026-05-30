import { z } from "zod";
import { SCREENING_LABELS } from "@/lib/screening";

export const namingLaneSchema = z.enum([
  "descriptive",
  "compound",
  "invented",
  "metaphorical",
  "technical",
  "premium",
  "playful",
  "minimal"
]);

export type NamingLane = z.infer<typeof namingLaneSchema>;

export const projectBriefSchema = z.object({
  thing: z.string().min(2).max(120),
  description: z.string().min(8).max(1200),
  audience: z.string().min(2).max(240),
  category: z.string().min(2).max(160),
  geography: z.string().min(2).max(120).default("United States"),
  tone: z.string().min(2).max(160),
  requiredWords: z.array(z.string().max(40)).default([]),
  forbiddenWords: z.array(z.string().max(40)).default([]),
  competitors: z.array(z.string().max(80)).default([]),
  tlds: z.array(z.string().max(20)).default([".com", ".ai", ".io"]),
  lanes: z.array(namingLaneSchema).min(1).default(["descriptive", "compound", "invented", "metaphorical"]),
  sensitivity: z.enum(["standard", "high", "strict"]).default("standard")
});

export type ProjectBriefInput = z.infer<typeof projectBriefSchema>;

export const candidateSchema = z.object({
  name: z.string().min(2).max(64),
  tagline: z.string().min(4).max(140),
  lane: namingLaneSchema,
  rationale: z.string().min(8).max(400),
  pronunciation: z.string().max(120),
  spellingRisk: z.enum(["low", "medium", "high"]),
  toneTags: z.array(z.string().min(2).max(32)).min(1).max(6),
  scores: z.object({
    strategicFit: z.number().min(0).max(100),
    audienceFit: z.number().min(0).max(100),
    distinctiveness: z.number().min(0).max(100),
    memorability: z.number().min(0).max(100),
    pronunciationEase: z.number().min(0).max(100),
    spellingEase: z.number().min(0).max(100),
    taglineStrength: z.number().min(0).max(100)
  })
});

export type CandidateInput = z.infer<typeof candidateSchema>;

export const generationOutputSchema = z.object({
  promptVersion: z.string(),
  candidates: z.array(candidateSchema).min(1).max(80)
});

export type GenerationOutput = z.infer<typeof generationOutputSchema>;

export const screeningLabelSchema = z.enum(SCREENING_LABELS);
export const evidenceConfidenceSchema = z.enum(["high", "medium", "low", "unknown"]);

export const providerResultSchema = z.object({
  provider: z.string(),
  providerVersion: z.string(),
  checkType: z.enum(["internal", "domain", "trademark", "web", "social"]),
  label: screeningLabelSchema,
  confidence: evidenceConfidenceSchema.default("unknown"),
  source: z.string(),
  query: z.string(),
  jurisdiction: z.string().optional(),
  matchedFields: z.array(z.string()).default([]),
  summary: z.string(),
  rawPayloadHash: z.string().optional(),
  freshness: z.string(),
  occurredAt: z.string()
});

export type ProviderResultInput = z.infer<typeof providerResultSchema>;
