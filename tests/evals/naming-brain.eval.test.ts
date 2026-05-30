import { describe, expect, it } from "vitest";
import { evaluateCandidateBatch } from "@/server/ai/evals";
import { fallbackGenerateCandidates, generateCandidates } from "@/server/generation";
import type { ProjectBriefInput } from "@/lib/schemas";

const cases: Array<{ name: string; brief: ProjectBriefInput; count: 3 | 8 }> = [
  {
    name: "freelancer budgeting",
    count: 8,
    brief: {
      thing: "CalmLedger",
      description: "A calm budgeting app that helps freelancers plan taxes, invoices, and uneven monthly income.",
      audience: "freelancers",
      category: "budgeting software",
      geography: "United States",
      tone: "calm trustworthy",
      requiredWords: [],
      forbiddenWords: ["bank", "taxmax"],
      competitors: ["QuickBooks", "Wave"],
      tlds: [".com", ".io"],
      lanes: ["descriptive", "compound", "invented"],
      sensitivity: "standard"
    }
  },
  {
    name: "creator scheduling",
    count: 8,
    brief: {
      thing: "Creator scheduling studio",
      description: "A lightweight planning workspace for short-form video creators coordinating shoots, scripts, and sponsors.",
      audience: "independent creators",
      category: "content planning",
      geography: "United States",
      tone: "playful sharp",
      requiredWords: [],
      forbiddenWords: ["tiktok", "youtube"],
      competitors: ["Later", "Buffer"],
      tlds: [".com", ".co"],
      lanes: ["playful", "metaphorical", "minimal"],
      sensitivity: "standard"
    }
  },
  {
    name: "clinical ops",
    count: 3,
    brief: {
      thing: "Clinical handoff tracker",
      description: "A private operations tracker for small clinics that reduces missed patient handoffs between shifts.",
      audience: "clinic operators",
      category: "healthcare operations",
      geography: "United States",
      tone: "clear dependable",
      requiredWords: [],
      forbiddenWords: ["cure", "hipaa"],
      competitors: ["Epic", "Cerner"],
      tlds: [".com"],
      lanes: ["descriptive", "technical"],
      sensitivity: "strict"
    }
  }
];

describe("AI brain naming evals", () => {
  for (const item of cases) {
    it(`passes deterministic eval fixture: ${item.name}`, () => {
      const candidates = fallbackGenerateCandidates(item.brief, item.count);
      const result = evaluateCandidateBatch(item.brief, candidates, item.count);

      expect(result.passed, result.violations.join(", ")).toBe(true);
      expect(result.metrics.uniqueNames).toBe(item.count);
      expect(result.metrics.averageBrandScore).toBeGreaterThanOrEqual(68);
    });
  }

  it.runIf(process.env.AI_EVAL_LIVE === "true" && Boolean(process.env.OPENAI_API_KEY))("passes a tiny live model eval", async () => {
    const { brief } = cases[0];
    const generated = await generateCandidates(brief, 3, [], { accessType: "free_preview" });
    const result = evaluateCandidateBatch(brief, generated.candidates, 3);

    expect(generated.validationStatus).toBe("valid");
    expect(result.passed, result.violations.join(", ")).toBe(true);
  });
});
