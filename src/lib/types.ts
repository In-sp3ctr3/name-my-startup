import type { CandidateInput, NamingLane, ProjectBriefInput, ProviderResultInput } from "@/lib/schemas";

export type EntityStatus = "active" | "deleted";
export type CandidateStatus = "generated" | "saved" | "rejected" | "shortlisted";
export type ReportFormat = "markdown" | "pdf" | "csv";
export type ProjectAccessType = "free_preview" | "paid_pack";
export type PaidPackStatus = "none" | "pending" | "paid";
export type GenerationRunStatus = "pending" | "running" | "succeeded" | "failed";
export type CheckoutIntentStatus = "created" | "provider_unconfigured" | "pending" | "completed" | "expired" | "canceled";
export type ProviderEventStatus = "received" | "processed" | "ignored" | "failed";
export type AiProvider = "openai" | "openrouter" | "fixture";
export type AiTask = "naming_generation" | "naming_eval" | "screening_synthesis";
export type JobRunStatus = "queued" | "running" | "succeeded" | "failed";
export type JobRunType = "generation" | "screening" | "report";

export interface Actor {
  userId: string;
  orgId: string;
  email?: string;
  source: "clerk" | "demo" | "anonymous";
  anonSessionHash?: string;
}

export interface Project {
  id: string;
  ownerUserId: string;
  orgId: string;
  name: string;
  brief: ProjectBriefInput;
  accessType: ProjectAccessType;
  paidPackStatus: PaidPackStatus;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate extends CandidateInput {
  id: string;
  projectId: string;
  generationRunId: string;
  status: CandidateStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationRun {
  id: string;
  projectId: string;
  status: GenerationRunStatus;
  model: string;
  accessType: ProjectAccessType;
  promptVersion: string;
  schemaVersion: string;
  validationStatus: "valid" | "fallback" | "failed";
  outputSnapshot?: unknown;
  costEstimateCents: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface AiUsageEvent {
  id: string;
  ownerUserId: string;
  orgId: string;
  projectId?: string;
  generationRunId?: string;
  provider: AiProvider;
  model: string;
  task: AiTask;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicroCents: number;
  status: "succeeded" | "failed" | "fallback";
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface ProviderCacheEntry {
  id: string;
  provider: string;
  checkType: string;
  cacheKey: string;
  queryHash: string;
  resultPayload: unknown;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobRun {
  id: string;
  ownerUserId: string;
  orgId: string;
  projectId?: string;
  jobType: JobRunType;
  status: JobRunStatus;
  idempotencyKey: string;
  requestPayload: unknown;
  resultPayload?: unknown;
  attempts: number;
  maxAttempts: number;
  runAfter: string;
  lockedAt?: string;
  lockedBy?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ScreeningRun {
  id: string;
  projectId: string;
  status: "running" | "completed" | "failed";
  sourceMode: "mock" | "real";
  createdAt: string;
  completedAt?: string;
}

export interface ScreeningSourceResult extends ProviderResultInput {
  id: string;
  projectId: string;
  screeningRunId: string;
  candidateId: string;
}

export interface ReportSnapshot {
  id: string;
  projectId: string;
  format: ReportFormat;
  markdown: string;
  candidateIds: string[];
  disclaimerVersion: string;
  promptVersion: string;
  scoringVersion: string;
  screeningVersion: string;
  createdAt: string;
  deletedAt?: string;
}

export interface AuditEvent {
  id: string;
  actorUserId: string;
  orgId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface ProductEvent {
  id: string;
  orgId: string;
  eventName: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface FreePreviewClaim {
  id: string;
  userId: string;
  orgId: string;
  projectId: string;
  anonSessionHash?: string;
  createdAt: string;
}

export interface ProjectPack {
  id: string;
  projectId: string;
  ownerUserId: string;
  orgId: string;
  status: "pending" | "paid";
  provider: "placeholder" | "stripe" | "lemon_squeezy";
  externalCheckoutId?: string;
  externalPaymentId?: string;
  amountCents: number;
  currency: "usd";
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutIntent {
  id: string;
  projectId: string;
  ownerUserId: string;
  orgId: string;
  provider: ProjectPack["provider"];
  status: CheckoutIntentStatus;
  amountCents: number;
  currency: "usd";
  externalCheckoutId?: string;
  checkoutUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingHistoryItem {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  names: number;
  price: string;
  when: string;
  status: "free" | "unlocked";
  createdAt: string;
}

export interface BillingSummary {
  currentPack?: {
    projectId: string;
    projectName: string;
    names: number;
    price: string;
    status: "unlocked";
  };
  history: BillingHistoryItem[];
  nextCursor?: string;
  total: number;
}

export interface RetentionTombstone {
  id: string;
  entityType: string;
  entityId: string;
  orgId: string;
  reason: string;
  createdAt: string;
}

export interface AiUsageSummary {
  dailyEstimatedCostCents: number;
  totalEstimatedCostCents: number;
  dailyEvents: number;
  totalEvents: number;
}

export interface JobHealthSummary {
  total: number;
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  latest?: string;
}

export interface ProjectSnapshot {
  project: Project;
  candidates: Candidate[];
  generationRuns: GenerationRun[];
  screeningRuns: ScreeningRun[];
  screeningResults: ScreeningSourceResult[];
  reports: ReportSnapshot[];
}

export const NAMING_LANES: { value: NamingLane; label: string }[] = [
  { value: "descriptive", label: "Descriptive" },
  { value: "compound", label: "Compound" },
  { value: "invented", label: "Invented" },
  { value: "metaphorical", label: "Metaphorical" },
  { value: "technical", label: "Technical" },
  { value: "premium", label: "Premium" },
  { value: "playful", label: "Playful" },
  { value: "minimal", label: "Minimal" }
];
