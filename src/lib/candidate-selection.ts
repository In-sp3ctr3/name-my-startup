import { averageScores } from "@/lib/scoring";
import type { Candidate } from "@/lib/types";

const spellingRiskWeight = {
  low: 0,
  medium: 1,
  high: 2
} as const;

export type CandidateSortMode = "best-fit" | "memorable" | "lowest-spelling-risk";

export function normalizedCandidateName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function dedupeCandidatesByName(candidates: Candidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = normalizedCandidateName(candidate.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sortCandidates(candidates: Candidate[], mode: CandidateSortMode) {
  return [...candidates].sort((left, right) => {
    if (mode === "memorable") {
      return right.scores.memorability - left.scores.memorability || averageScores(right.scores) - averageScores(left.scores);
    }

    if (mode === "lowest-spelling-risk") {
      return (
        spellingRiskWeight[left.spellingRisk] - spellingRiskWeight[right.spellingRisk] ||
        right.scores.spellingEase - left.scores.spellingEase ||
        averageScores(right.scores) - averageScores(left.scores)
      );
    }

    return averageScores(right.scores) - averageScores(left.scores);
  });
}

export function candidatesForCheckedRecommendations(candidates: Candidate[], favorites: Candidate[], limit = 5) {
  const pool = favorites.length > 0 ? favorites : candidates.filter((candidate) => candidate.status !== "rejected");
  return sortCandidates(dedupeCandidatesByName(pool), "best-fit").slice(0, limit);
}
