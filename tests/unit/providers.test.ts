import { describe, expect, it } from "vitest";
import { mockDomainAdapter, mockInternalAdapter } from "@/server/providers/mock";
import type { Candidate } from "@/lib/types";
import type { ProjectBriefInput } from "@/lib/schemas";

const brief: ProjectBriefInput = {
  thing: "Test Product",
  description: "A test product for checking naming workflow behavior.",
  audience: "founders",
  category: "founder tools",
  geography: "United States",
  tone: "calm",
  requiredWords: [],
  forbiddenWords: [],
  competitors: ["Atlas"],
  tlds: [".com", ".ai"],
  lanes: ["descriptive"],
  sensitivity: "standard"
};

const candidate: Candidate = {
  id: "candidate-1",
  projectId: "project-1",
  generationRunId: "run-1",
  name: "AtlasBench",
  tagline: "A test tagline",
  lane: "descriptive",
  rationale: "A test rationale.",
  pronunciation: "atlas bench",
  spellingRisk: "low",
  toneTags: ["calm"],
  scores: {
    strategicFit: 80,
    audienceFit: 80,
    distinctiveness: 70,
    memorability: 75,
    pronunciationEase: 80,
    spellingEase: 80,
    taglineStrength: 72
  },
  status: "shortlisted",
  notes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe("provider adapters", () => {
  it("flags competitor similarity through the internal adapter", async () => {
    const [result] = await mockInternalAdapter.run({ candidate, brief, sourceMode: "mock" });
    expect(result.label).toBe("possible_conflict_found");
    expect(result.confidence).toBe("high");
    expect(result.summary).toContain("requires human/legal review");
  });

  it("returns canonical labels from domain fixtures", async () => {
    const results = await mockDomainAdapter.run({ candidate, brief, sourceMode: "mock" });
    expect(results).toHaveLength(2);
    expect(results.every((result) => typeof result.label === "string")).toBe(true);
    expect(results.every((result) => ["high", "medium", "low", "unknown"].includes(result.confidence))).toBe(true);
  });
});
