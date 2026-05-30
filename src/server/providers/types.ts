import type { z } from "zod";
import type { Candidate } from "@/lib/types";
import { providerResultSchema, type ProjectBriefInput, type ProviderResultInput } from "@/lib/schemas";

export type ProviderCheckType = ProviderResultInput["checkType"];

export interface ProviderInput {
  candidate: Candidate;
  brief: ProjectBriefInput;
  sourceMode: "mock" | "real";
}

export interface ProviderAdapter {
  provider: string;
  version: string;
  checkType: ProviderCheckType;
  inputSchema: z.ZodType<ProviderInput>;
  run(input: ProviderInput): Promise<ProviderResultInput[]>;
}

export function normalizeProviderResult(result: ProviderResultInput) {
  return providerResultSchema.parse(result);
}

