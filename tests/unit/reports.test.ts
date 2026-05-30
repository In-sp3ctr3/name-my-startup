import { describe, expect, it } from "vitest";
import { REQUIRED_DISCLAIMER } from "@/lib/legal-language";
import type { Candidate, Project, ScreeningSourceResult } from "@/lib/types";
import { renderMarkdownReport } from "@/server/reports";

const project: Project = {
  id: "project-1",
  ownerUserId: "demo-user",
  orgId: "demo-org",
  name: "Test Product",
  accessType: "free_preview",
  paidPackStatus: "none",
  status: "active",
  brief: {
    thing: "Test Product",
    description: "A test product for founders.",
    audience: "founders",
    category: "founder tools",
    geography: "United States",
    tone: "calm",
    requiredWords: [],
    forbiddenWords: [],
    competitors: [],
    tlds: [".com"],
    lanes: ["descriptive"],
    sensitivity: "standard"
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const candidate: Candidate = {
  id: "candidate-1",
  projectId: "project-1",
  generationRunId: "run-1",
  name: "SignalFoundry",
  tagline: "Names for founders",
  lane: "descriptive",
  rationale: "Fits the naming studio brief.",
  pronunciation: "signal foundry",
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

const result: ScreeningSourceResult = {
  id: "result-1",
  projectId: "project-1",
  screeningRunId: "screen-1",
  candidateId: "candidate-1",
  provider: "mock",
  providerVersion: "1",
  checkType: "domain",
  label: "provider_error",
  confidence: "unknown",
  source: "mock provider",
  query: "signalfoundry.com",
  matchedFields: [],
  summary: "Provider error cannot be treated as favorable evidence.",
  freshness: "mock",
  occurredAt: new Date().toISOString()
};

describe("report snapshots", () => {
  it("includes disclaimer and failure labels", () => {
    const markdown = renderMarkdownReport({
      project,
      candidates: [candidate],
      results: [result],
      promptVersion: "test"
    });
    expect(markdown).toContain(REQUIRED_DISCLAIMER);
    expect(markdown).toContain("Provider error");
    expect(markdown).not.toContain("final permission");
  });
});
