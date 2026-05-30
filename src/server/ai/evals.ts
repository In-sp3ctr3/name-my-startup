import { assertNoProhibitedClaims } from "@/lib/legal-language";
import type { CandidateInput, ProjectBriefInput } from "@/lib/schemas";
import { averageScores } from "@/lib/scoring";
import { findAbuseSignals } from "@/server/abuse";

export type NamingEvalResult = {
  passed: boolean;
  score: number;
  violations: string[];
  metrics: {
    count: number;
    uniqueNames: number;
    laneCoverage: number;
    averageBrandScore: number;
  };
};

function includesAny(text: string, words: string[]) {
  const normalized = text.toLowerCase();
  return words.some((word) => word.trim() && normalized.includes(word.toLowerCase()));
}

export function evaluateCandidateBatch(brief: ProjectBriefInput, candidates: CandidateInput[], expectedCount: number): NamingEvalResult {
  const violations: string[] = [];
  const normalizedNames = candidates.map((candidate) => candidate.name.trim().toLowerCase());
  const uniqueNames = new Set(normalizedNames);
  const lanes = new Set(candidates.map((candidate) => candidate.lane));
  const requestedLanes = new Set(brief.lanes);
  const scores = candidates.map((candidate) => averageScores(candidate.scores));

  if (candidates.length !== expectedCount) violations.push(`expected_${expectedCount}_candidates`);
  if (uniqueNames.size !== candidates.length) violations.push("duplicate_names");

  for (const candidate of candidates) {
    const text = `${candidate.name} ${candidate.tagline} ${candidate.rationale}`;
    try {
      assertNoProhibitedClaims(text);
    } catch {
      violations.push(`prohibited_claim:${candidate.name}`);
    }
    if (includesAny(text, brief.forbiddenWords)) violations.push(`forbidden_word:${candidate.name}`);
    if (brief.competitors.some((competitor) => candidate.name.toLowerCase().includes(competitor.toLowerCase().slice(0, 5)))) {
      violations.push(`competitor_overlap:${candidate.name}`);
    }
    const abuseSignals = findAbuseSignals(candidate.name);
    if (abuseSignals.length) violations.push(`abuse_signal:${candidate.name}:${abuseSignals.join(",")}`);
    if (!requestedLanes.has(candidate.lane)) violations.push(`unexpected_lane:${candidate.name}`);
    if (candidate.name.length > 28) violations.push(`long_name:${candidate.name}`);
  }

  const averageBrandScore = scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : 0;
  if (averageBrandScore < 68) violations.push("low_average_brand_score");
  if (lanes.size < Math.min(requestedLanes.size, Math.max(1, Math.ceil(expectedCount / 3)))) violations.push("thin_lane_coverage");

  const score = Math.max(0, 100 - violations.length * 12);
  return {
    passed: violations.length === 0,
    score,
    violations,
    metrics: {
      count: candidates.length,
      uniqueNames: uniqueNames.size,
      laneCoverage: lanes.size,
      averageBrandScore: Math.round(averageBrandScore)
    }
  };
}
