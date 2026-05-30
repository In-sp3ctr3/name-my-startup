import { candidatesForCheckedRecommendations } from "@/lib/candidate-selection";
import type { Candidate, ProjectSnapshot } from "@/lib/types";

export function namesForCheckedRecommendations(snapshot: ProjectSnapshot, limit = 5): Candidate[] {
  const favorites = snapshot.candidates.filter((candidate) => candidate.status === "shortlisted");
  return candidatesForCheckedRecommendations(snapshot.candidates, favorites, limit);
}
