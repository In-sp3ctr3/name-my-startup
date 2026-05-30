import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const candidateStatusEnum = pgEnum("candidate_status", ["generated", "saved", "rejected", "shortlisted"]);
export const entityStatusEnum = pgEnum("entity_status", ["active", "deleted"]);
export const projectAccessTypeEnum = pgEnum("project_access_type", ["free_preview", "paid_pack"]);
export const paidPackStatusEnum = pgEnum("paid_pack_status", ["none", "pending", "paid"]);
export const generationRunStatusEnum = pgEnum("generation_run_status", ["pending", "running", "succeeded", "failed"]);
export const checkoutIntentStatusEnum = pgEnum("checkout_intent_status", ["created", "provider_unconfigured", "pending", "completed", "expired", "canceled"]);
export const providerEventStatusEnum = pgEnum("provider_event_status", ["received", "processed", "ignored", "failed"]);
export const screeningRunStatusEnum = pgEnum("screening_run_status", ["running", "completed", "failed"]);
export const reportFormatEnum = pgEnum("report_format", ["markdown", "pdf", "csv"]);
export const jobRunStatusEnum = pgEnum("job_run_status", ["queued", "running", "succeeded", "failed"]);
export const jobRunTypeEnum = pgEnum("job_run_type", ["generation", "screening", "report"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  clerkOrgId: text("clerk_org_id").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    orgId: text("org_id").notNull().references(() => organizations.id),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    membershipUnique: uniqueIndex("memberships_user_org_idx").on(table.userId, table.orgId)
  })
);

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  brief: jsonb("brief").notNull(),
  accessType: projectAccessTypeEnum("access_type").default("free_preview").notNull(),
  paidPackStatus: paidPackStatusEnum("paid_pack_status").default("none").notNull(),
  status: entityStatusEnum("status").default("active").notNull(),
  strictConfidentialMode: boolean("strict_confidential_mode").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const generationRuns = pgTable("generation_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  status: generationRunStatusEnum("status").default("pending").notNull(),
  model: text("model").notNull(),
  accessType: projectAccessTypeEnum("access_type").notNull(),
  promptVersion: text("prompt_version").notNull(),
  schemaVersion: text("schema_version").notNull(),
  validationStatus: text("validation_status").notNull(),
  outputSnapshot: jsonb("output_snapshot"),
  costEstimateCents: integer("cost_estimate_cents").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorMessage: text("error_message")
});

export const anonymousSessions = pgTable("anonymous_sessions", {
  id: text("id").primaryKey(),
  sessionHash: text("session_hash").notNull().unique(),
  mergedUserId: text("merged_user_id"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull()
});

export const freePreviewClaims = pgTable(
  "free_preview_claims",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
    anonSessionHash: text("anon_session_hash"),
    projectId: text("project_id").notNull().references(() => projects.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    oneFreePreviewPerUser: uniqueIndex("free_preview_claims_user_idx").on(table.userId),
    oneFreePreviewPerAnonSession: uniqueIndex("free_preview_claims_anon_session_idx").on(table.anonSessionHash)
  })
);

export const projectPacks = pgTable(
  "project_packs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id),
    ownerUserId: text("owner_user_id").notNull(),
    orgId: text("org_id").notNull(),
    status: paidPackStatusEnum("status").default("pending").notNull(),
    provider: text("provider").notNull(),
    externalCheckoutId: text("external_checkout_id"),
    externalPaymentId: text("external_payment_id"),
    amountCents: integer("amount_cents").default(500).notNull(),
    currency: text("currency").default("usd").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    onePackPerProject: uniqueIndex("project_packs_project_idx").on(table.projectId),
    paymentUnique: uniqueIndex("project_packs_payment_idx").on(table.provider, table.externalPaymentId)
  })
);

export const checkoutIntents = pgTable("checkout_intents", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  ownerUserId: text("owner_user_id").notNull(),
  orgId: text("org_id").notNull(),
  provider: text("provider").notNull(),
  status: checkoutIntentStatusEnum("status").default("created").notNull(),
  externalCheckoutId: text("external_checkout_id"),
  checkoutUrl: text("checkout_url"),
  amountCents: integer("amount_cents").default(500).notNull(),
  currency: text("currency").default("usd").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const billingEvents = pgTable("billing_events", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  orgId: text("org_id").notNull(),
  projectId: text("project_id").references(() => projects.id),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  names: integer("names").default(0).notNull(),
  amountCents: integer("amount_cents").default(0).notNull(),
  currency: text("currency").default("usd").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const providerEvents = pgTable(
  "provider_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    externalEventId: text("external_event_id").notNull(),
    eventType: text("event_type").notNull(),
    status: providerEventStatusEnum("status").default("received").notNull(),
    payloadHash: text("payload_hash").notNull(),
    metadata: jsonb("metadata").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    providerEventUnique: uniqueIndex("provider_events_external_idx").on(table.provider, table.externalEventId)
  })
);

export const aiUsageEvents = pgTable("ai_usage_events", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  orgId: text("org_id").notNull(),
  projectId: text("project_id").references(() => projects.id),
  generationRunId: text("generation_run_id").references(() => generationRuns.id),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  task: text("task").notNull(),
  promptVersion: text("prompt_version").notNull(),
  inputTokens: integer("input_tokens").default(0).notNull(),
  outputTokens: integer("output_tokens").default(0).notNull(),
  estimatedCostMicroCents: integer("estimated_cost_micro_cents").default(0).notNull(),
  status: text("status").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const providerCacheEntries = pgTable(
  "provider_cache_entries",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    checkType: text("check_type").notNull(),
    cacheKey: text("cache_key").notNull(),
    queryHash: text("query_hash").notNull(),
    resultPayload: jsonb("result_payload").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    providerCacheUnique: uniqueIndex("provider_cache_entries_key_idx").on(table.provider, table.checkType, table.cacheKey)
  })
);

export const jobRuns = pgTable(
  "job_runs",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    orgId: text("org_id").notNull(),
    projectId: text("project_id").references(() => projects.id),
    jobType: jobRunTypeEnum("job_type").notNull(),
    status: jobRunStatusEnum("status").default("queued").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestPayload: jsonb("request_payload").notNull(),
    resultPayload: jsonb("result_payload"),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    runAfter: timestamp("run_after", { withTimezone: true }).defaultNow().notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => ({
    jobRunsIdempotencyUnique: uniqueIndex("job_runs_idempotency_idx").on(table.idempotencyKey),
    jobRunsClaimIdx: index("job_runs_claim_idx").on(table.status, table.runAfter, table.createdAt),
    jobRunsLockIdx: index("job_runs_lock_idx").on(table.status, table.lockedAt)
  })
);

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").primaryKey(),
  count: integer("count").default(0).notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const candidates = pgTable("candidates", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  generationRunId: text("generation_run_id").notNull().references(() => generationRuns.id),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  lane: text("lane").notNull(),
  rationale: text("rationale").notNull(),
  pronunciation: text("pronunciation").notNull(),
  spellingRisk: text("spelling_risk").notNull(),
  toneTags: jsonb("tone_tags").notNull(),
  scores: jsonb("scores").notNull(),
  status: candidateStatusEnum("status").default("generated").notNull(),
  notes: text("notes").default("").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const screeningRuns = pgTable("screening_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  status: screeningRunStatusEnum("status").default("running").notNull(),
  sourceMode: text("source_mode").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const providerResults = pgTable("provider_results", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  screeningRunId: text("screening_run_id").notNull().references(() => screeningRuns.id),
  candidateId: text("candidate_id").notNull().references(() => candidates.id),
  provider: text("provider").notNull(),
  providerVersion: text("provider_version").notNull(),
  checkType: text("check_type").notNull(),
  label: text("label").notNull(),
  confidence: text("confidence").default("unknown").notNull(),
  source: text("source").notNull(),
  query: text("query").notNull(),
  jurisdiction: text("jurisdiction"),
  matchedFields: jsonb("matched_fields").notNull(),
  summary: text("summary").notNull(),
  rawPayloadHash: text("raw_payload_hash"),
  freshness: text("freshness").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull()
});

export const reportSnapshots = pgTable("report_snapshots", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  format: reportFormatEnum("format").default("markdown").notNull(),
  markdown: text("markdown").notNull(),
  candidateIds: jsonb("candidate_ids").notNull(),
  disclaimerVersion: text("disclaimer_version").notNull(),
  promptVersion: text("prompt_version").notNull(),
  scoringVersion: text("scoring_version").notNull(),
  screeningVersion: text("screening_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").notNull(),
  orgId: text("org_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const productEvents = pgTable("product_events", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  eventName: text("event_name").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const retentionTombstones = pgTable("retention_tombstones", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  orgId: text("org_id").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
