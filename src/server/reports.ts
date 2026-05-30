import { REQUIRED_DISCLAIMER, assertNoProhibitedClaims } from "@/lib/legal-language";
import { SCREENING_LABEL_COPY } from "@/lib/screening";
import type { Candidate, Project, ReportSnapshot, ScreeningSourceResult } from "@/lib/types";

export const DISCLAIMER_VERSION = "screening-disclaimer-v1";
export const SCORING_VERSION = "dimensional-scoring-v1";
export const SCREENING_VERSION = "progressive-screening-v1";

function section(title: string, body: string) {
  return `## ${title}\n\n${body.trim()}\n`;
}

export function renderMarkdownReport({
  project,
  candidates,
  results,
  promptVersion
}: {
  project: Project;
  candidates: Candidate[];
  results: ScreeningSourceResult[];
  promptVersion: string;
}) {
  const lines: string[] = [
    `# ${project.name} Checked Recommendations`,
    "",
    `Created: ${new Date().toISOString()}`,
    "",
    `> ${REQUIRED_DISCLAIMER}`,
    ""
  ];

  lines.push(
    section(
      "Project",
      [`Thing: ${project.brief.thing}`, `Audience: ${project.brief.audience}`, `Category: ${project.brief.category}`, `Geography: ${project.brief.geography}`].join("\n")
    )
  );

  lines.push("## Checked Recommendations\n");
  for (const candidate of candidates) {
    const candidateResults = results.filter((result) => result.candidateId === candidate.id);
    lines.push(`### ${candidate.name}`);
    lines.push("");
    lines.push(`Tagline: ${candidate.tagline}`);
    lines.push(`Naming lane: ${candidate.lane}`);
    lines.push(`Why it fits: ${candidate.rationale}`);
    lines.push("");
    lines.push("| Source | Screening result | Confidence | Query | Summary |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const result of candidateResults) {
      lines.push(
        `| ${result.source} | ${SCREENING_LABEL_COPY[result.label]} | ${result.confidence} | ${result.query} | ${result.summary.replace(/\|/g, "/")} |`
      );
    }
    if (candidateResults.length === 0) {
      lines.push("| Not run | Source not checked | unknown | N/A | Screening has not been run for this candidate. |");
    }
    lines.push("");
  }

  lines.push(
    section(
      "Versions",
      [
        `Prompt version: ${promptVersion}`,
        `Scoring version: ${SCORING_VERSION}`,
        `Screening version: ${SCREENING_VERSION}`,
        `Disclaimer version: ${DISCLAIMER_VERSION}`
      ].join("\n")
    )
  );

  lines.push(section("Next Steps", "Review shortlisted names with qualified trademark counsel before purchase, launch, or filing decisions."));
  const markdown = lines.join("\n");
  assertNoProhibitedClaims(markdown);
  return markdown;
}

export function buildReportSnapshot(input: {
  projectId: string;
  markdown: string;
  candidateIds: string[];
  promptVersion: string;
}): Omit<ReportSnapshot, "id" | "createdAt"> {
  return {
    projectId: input.projectId,
    format: "markdown",
    markdown: input.markdown,
    candidateIds: input.candidateIds,
    disclaimerVersion: DISCLAIMER_VERSION,
    promptVersion: input.promptVersion,
    scoringVersion: SCORING_VERSION,
    screeningVersion: SCREENING_VERSION
  };
}
