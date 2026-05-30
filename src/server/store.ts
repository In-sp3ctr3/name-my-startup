import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as dbSchema from "@/db/schema";
import { env, hasDatabaseConfig, inMemoryStoreAllowed } from "@/env";
import { PRODUCT_OFFER } from "@/lib/product-offer";
import { candidateSchema, projectBriefSchema, providerResultSchema, type ProjectBriefInput } from "@/lib/schemas";
import type {
  Actor,
  AiUsageSummary,
  AiUsageEvent,
  AuditEvent,
  BillingHistoryItem,
  BillingSummary,
  Candidate,
  CandidateStatus,
  CheckoutIntent,
  CheckoutIntentStatus,
  FreePreviewClaim,
  GenerationRun,
  JobHealthSummary,
  JobRun,
  JobRunType,
  PaidPackStatus,
  ProductEvent,
  Project,
  ProjectAccessType,
  ProjectPack,
  ProjectSnapshot,
  ProviderEventStatus,
  ProviderCacheEntry,
  ReportSnapshot,
  RetentionTombstone,
  ScreeningRun,
  ScreeningSourceResult
} from "@/lib/types";
import { canAccessProject } from "@/server/auth";
import { createAuditEvent, createProductEvent } from "@/server/audit";

type Db = NonNullable<ReturnType<typeof getDb>>;

type AnonymousSession = {
  id: string;
  sessionHash: string;
  mergedUserId?: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

type BillingEvent = {
  id: string;
  ownerUserId: string;
  orgId: string;
  projectId?: string;
  eventType: string;
  title: string;
  description: string;
  names: number;
  amountCents: number;
  currency: "usd";
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};

type ProviderEvent = {
  id: string;
  provider: ProjectPack["provider"];
  externalEventId: string;
  eventType: string;
  status: ProviderEventStatus;
  payloadHash: string;
  metadata: Record<string, string | number | boolean | null>;
  processedAt?: string;
  createdAt: string;
};

type RateLimitBucket = {
  key: string;
  count: number;
  resetAt: string;
  updatedAt: string;
};

interface StoreState {
  anonymousSessions: AnonymousSession[];
  projects: Project[];
  candidates: Candidate[];
  generationRuns: GenerationRun[];
  freePreviewClaims: FreePreviewClaim[];
  projectPacks: ProjectPack[];
  checkoutIntents: CheckoutIntent[];
  billingEvents: BillingEvent[];
  providerEvents: ProviderEvent[];
  aiUsageEvents: AiUsageEvent[];
  providerCacheEntries: ProviderCacheEntry[];
  jobRuns: JobRun[];
  rateLimitBuckets: RateLimitBucket[];
  screeningRuns: ScreeningRun[];
  screeningResults: ScreeningSourceResult[];
  reports: ReportSnapshot[];
  auditEvents: AuditEvent[];
  productEvents: ProductEvent[];
  tombstones: RetentionTombstone[];
}

const globalForStore = globalThis as unknown as { nameMyStartupStore?: StoreState };

function state(): StoreState {
  globalForStore.nameMyStartupStore ??= {
    anonymousSessions: [],
    projects: [],
    candidates: [],
    generationRuns: [],
    freePreviewClaims: [],
    projectPacks: [],
    checkoutIntents: [],
    billingEvents: [],
    providerEvents: [],
    aiUsageEvents: [],
    providerCacheEntries: [],
    jobRuns: [],
    rateLimitBuckets: [],
    screeningRuns: [],
    screeningResults: [],
    reports: [],
    auditEvents: [],
    productEvents: [],
    tombstones: []
  };
  return globalForStore.nameMyStartupStore;
}

function now() {
  return new Date().toISOString();
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function anonUserId(sessionHash: string) {
  return `anon:${sessionHash.slice(0, 24)}`;
}

function deletedProjectBrief(): ProjectBriefInput {
  return {
    thing: "Deleted project",
    description: "Deleted content",
    audience: "Deleted",
    category: "Deleted",
    geography: "Deleted",
    tone: "Deleted",
    requiredWords: [],
    forbiddenWords: [],
    competitors: [],
    tlds: [],
    lanes: ["descriptive"],
    sensitivity: "standard"
  };
}

function microCentsToDisplayCents(value: number) {
  return Math.ceil(value / 1_000_000);
}

function database() {
  const db = getDb();
  if (!db && !inMemoryStoreAllowed) {
    throw new BusinessRuleError("database_required", "DATABASE_URL is required outside local/test fallback mode.", 503);
  }
  return db;
}

function mapProject(row: typeof dbSchema.projects.$inferSelect): Project {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    orgId: row.orgId,
    name: row.name,
    brief: projectBriefSchema.parse(row.brief),
    accessType: row.accessType,
    paidPackStatus: row.paidPackStatus,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapCandidate(row: typeof dbSchema.candidates.$inferSelect): Candidate {
  const parsed = candidateSchema.parse({
    name: row.name,
    tagline: row.tagline,
    lane: row.lane,
    rationale: row.rationale,
    pronunciation: row.pronunciation,
    spellingRisk: row.spellingRisk,
    toneTags: row.toneTags,
    scores: row.scores
  });
  return {
    id: row.id,
    projectId: row.projectId,
    generationRunId: row.generationRunId,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...parsed
  };
}

function mapGenerationRun(row: typeof dbSchema.generationRuns.$inferSelect): GenerationRun {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status,
    model: row.model,
    accessType: row.accessType,
    promptVersion: row.promptVersion,
    schemaVersion: row.schemaVersion,
    validationStatus: row.validationStatus as GenerationRun["validationStatus"],
    outputSnapshot: row.outputSnapshot ?? undefined,
    costEstimateCents: row.costEstimateCents,
    createdAt: row.createdAt.toISOString(),
    completedAt: toIso(row.completedAt),
    errorMessage: row.errorMessage ?? undefined
  };
}

function mapAiUsageEvent(row: typeof dbSchema.aiUsageEvents.$inferSelect): AiUsageEvent {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    orgId: row.orgId,
    projectId: row.projectId ?? undefined,
    generationRunId: row.generationRunId ?? undefined,
    provider: row.provider as AiUsageEvent["provider"],
    model: row.model,
    task: row.task as AiUsageEvent["task"],
    promptVersion: row.promptVersion,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    estimatedCostMicroCents: row.estimatedCostMicroCents,
    status: row.status as AiUsageEvent["status"],
    metadata: row.metadata as AiUsageEvent["metadata"],
    createdAt: row.createdAt.toISOString()
  };
}

function mapProviderCacheEntry(row: typeof dbSchema.providerCacheEntries.$inferSelect): ProviderCacheEntry {
  return {
    id: row.id,
    provider: row.provider,
    checkType: row.checkType,
    cacheKey: row.cacheKey,
    queryHash: row.queryHash,
    resultPayload: row.resultPayload,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapJobRun(row: typeof dbSchema.jobRuns.$inferSelect): JobRun {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    orgId: row.orgId,
    projectId: row.projectId ?? undefined,
    jobType: row.jobType,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    requestPayload: row.requestPayload,
    resultPayload: row.resultPayload ?? undefined,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    runAfter: row.runAfter.toISOString(),
    lockedAt: toIso(row.lockedAt),
    lockedBy: row.lockedBy ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: toIso(row.startedAt),
    completedAt: toIso(row.completedAt)
  };
}

function mapProjectPack(row: typeof dbSchema.projectPacks.$inferSelect): ProjectPack {
  return {
    id: row.id,
    projectId: row.projectId,
    ownerUserId: row.ownerUserId,
    orgId: row.orgId,
    status: row.status === "paid" ? "paid" : "pending",
    provider: row.provider as ProjectPack["provider"],
    externalCheckoutId: row.externalCheckoutId ?? undefined,
    externalPaymentId: row.externalPaymentId ?? undefined,
    amountCents: row.amountCents,
    currency: "usd",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapScreeningRun(row: typeof dbSchema.screeningRuns.$inferSelect): ScreeningRun {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status,
    sourceMode: row.sourceMode as ScreeningRun["sourceMode"],
    createdAt: row.createdAt.toISOString(),
    completedAt: toIso(row.completedAt)
  };
}

function mapScreeningResult(row: typeof dbSchema.providerResults.$inferSelect): ScreeningSourceResult {
  return {
    id: row.id,
    projectId: row.projectId,
    screeningRunId: row.screeningRunId,
    candidateId: row.candidateId,
    provider: row.provider,
    providerVersion: row.providerVersion,
    checkType: row.checkType as ScreeningSourceResult["checkType"],
    label: row.label as ScreeningSourceResult["label"],
    confidence: row.confidence as ScreeningSourceResult["confidence"],
    source: row.source,
    query: row.query,
    jurisdiction: row.jurisdiction ?? undefined,
    matchedFields: Array.isArray(row.matchedFields) ? (row.matchedFields as string[]) : [],
    summary: row.summary,
    rawPayloadHash: row.rawPayloadHash ?? undefined,
    freshness: row.freshness,
    occurredAt: row.occurredAt.toISOString()
  };
}

function mapReport(row: typeof dbSchema.reportSnapshots.$inferSelect): ReportSnapshot {
  return {
    id: row.id,
    projectId: row.projectId,
    format: row.format,
    markdown: row.markdown,
    candidateIds: Array.isArray(row.candidateIds) ? (row.candidateIds as string[]) : [],
    disclaimerVersion: row.disclaimerVersion,
    promptVersion: row.promptVersion,
    scoringVersion: row.scoringVersion,
    screeningVersion: row.screeningVersion,
    createdAt: row.createdAt.toISOString(),
    deletedAt: toIso(row.deletedAt)
  };
}

async function ensureActor(actor: Actor, db: Db | null = database()) {
  if (actor.anonSessionHash) {
    const timestamp = now();
    if (db) {
      await db
        .insert(dbSchema.anonymousSessions)
        .values({ id: crypto.randomUUID(), sessionHash: actor.anonSessionHash, lastSeenAt: new Date(timestamp) })
        .onConflictDoUpdate({
          target: dbSchema.anonymousSessions.sessionHash,
          set: { lastSeenAt: new Date(timestamp) }
        });
    } else {
      const store = state();
      const existing = store.anonymousSessions.find((item) => item.sessionHash === actor.anonSessionHash);
      if (existing) existing.lastSeenAt = timestamp;
      else {
        store.anonymousSessions.push({
          id: crypto.randomUUID(),
          sessionHash: actor.anonSessionHash,
          firstSeenAt: timestamp,
          lastSeenAt: timestamp
        });
      }
    }
  }

  if (actor.source !== "anonymous") {
    if (db) {
      await db
        .insert(dbSchema.users)
        .values({
          id: actor.userId,
          clerkUserId: actor.userId,
          email: actor.email
        })
        .onConflictDoUpdate({
          target: dbSchema.users.id,
          set: { email: actor.email, updatedAt: new Date() }
        });
      await mergeAnonymousSession(actor, db);
    } else {
      await mergeAnonymousSession(actor, null);
    }
  }
}

async function mergeAnonymousSession(actor: Actor, db: Db | null) {
  if (!actor.anonSessionHash || actor.source === "anonymous") return;
  const anonymousUserId = anonUserId(actor.anonSessionHash);
  const timestamp = now();

  if (db) {
    const [existingUserClaim] = await db.select().from(dbSchema.freePreviewClaims).where(eq(dbSchema.freePreviewClaims.userId, actor.userId)).limit(1);
    const [anonymousClaim] = await db
      .select()
      .from(dbSchema.freePreviewClaims)
      .where(eq(dbSchema.freePreviewClaims.anonSessionHash, actor.anonSessionHash))
      .limit(1);

    if (!anonymousClaim) return;

    if (!existingUserClaim) {
      await db.update(dbSchema.freePreviewClaims).set({ userId: actor.userId, orgId: actor.orgId }).where(eq(dbSchema.freePreviewClaims.id, anonymousClaim.id));
      await db.update(dbSchema.projects).set({ ownerUserId: actor.userId, orgId: actor.orgId, updatedAt: new Date(timestamp) }).where(eq(dbSchema.projects.ownerUserId, anonymousUserId));
      await db.update(dbSchema.billingEvents).set({ ownerUserId: actor.userId, orgId: actor.orgId }).where(eq(dbSchema.billingEvents.ownerUserId, anonymousUserId));
    }
    await db.update(dbSchema.anonymousSessions).set({ mergedUserId: actor.userId, lastSeenAt: new Date(timestamp) }).where(eq(dbSchema.anonymousSessions.sessionHash, actor.anonSessionHash));
    return;
  }

  const store = state();
  const existingUserClaim = store.freePreviewClaims.find((claim) => claim.userId === actor.userId);
  const anonymousClaim = store.freePreviewClaims.find((claim) => claim.anonSessionHash === actor.anonSessionHash);
  if (!anonymousClaim) return;
  if (!existingUserClaim) {
    anonymousClaim.userId = actor.userId;
    anonymousClaim.orgId = actor.orgId;
    store.projects.forEach((project) => {
      if (project.ownerUserId === anonymousUserId) {
        project.ownerUserId = actor.userId;
        project.orgId = actor.orgId;
        project.updatedAt = timestamp;
      }
    });
    store.billingEvents.forEach((event) => {
      if (event.ownerUserId === anonymousUserId) {
        event.ownerUserId = actor.userId;
        event.orgId = actor.orgId;
      }
    });
  }
  const session = store.anonymousSessions.find((item) => item.sessionHash === actor.anonSessionHash);
  if (session) {
    session.mergedUserId = actor.userId;
    session.lastSeenAt = timestamp;
  }
}

export class BusinessRuleError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 409
  ) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

export async function listProjects(actor: Actor) {
  const db = database();
  await ensureActor(actor, db);
  if (db) {
    const rows = await db
      .select()
      .from(dbSchema.projects)
      .where(and(eq(dbSchema.projects.status, "active"), or(eq(dbSchema.projects.ownerUserId, actor.userId), eq(dbSchema.projects.orgId, actor.orgId))))
      .orderBy(desc(dbSchema.projects.createdAt));
    return rows.map(mapProject);
  }

  return state().projects.filter(
    (project) => project.status === "active" && canAccessProject(actor, project.orgId, project.ownerUserId)
  );
}

export async function hasUsedFreePreview(actor: Actor) {
  const db = database();
  await ensureActor(actor, db);
  if (db) {
    const predicates = [eq(dbSchema.freePreviewClaims.userId, actor.userId)];
    if (actor.anonSessionHash) predicates.push(eq(dbSchema.freePreviewClaims.anonSessionHash, actor.anonSessionHash));
    const [claim] = await db
      .select()
      .from(dbSchema.freePreviewClaims)
      .where(or(...predicates))
      .limit(1);
    return Boolean(claim);
  }
  return state().freePreviewClaims.some((claim) => claim.userId === actor.userId || (actor.anonSessionHash && claim.anonSessionHash === actor.anonSessionHash));
}

type CreateProjectOptions = {
  accessType?: ProjectAccessType;
  paidPackStatus?: PaidPackStatus;
};

function billingEventForProject(actor: Actor, project: Project, type: "free_preview" | "pack_paid"): BillingEvent {
  const paid = type === "pack_paid";
  return {
    id: crypto.randomUUID(),
    ownerUserId: actor.userId,
    orgId: actor.orgId,
    projectId: project.id,
    eventType: type,
    title: paid ? "Launch Pack purchased" : "Free preview unlocked",
    description: project.name,
    names: paid ? PRODUCT_OFFER.paidNameCount : PRODUCT_OFFER.freeNameCount,
    amountCents: paid ? PRODUCT_OFFER.paidPassPriceCents : 0,
    currency: "usd",
    metadata: { accessType: project.accessType },
    createdAt: now()
  };
}

async function insertBillingEvent(db: Db | null, event: BillingEvent) {
  if (db) {
    await db.insert(dbSchema.billingEvents).values({
      id: event.id,
      ownerUserId: event.ownerUserId,
      orgId: event.orgId,
      projectId: event.projectId,
      eventType: event.eventType,
      title: event.title,
      description: event.description,
      names: event.names,
      amountCents: event.amountCents,
      currency: event.currency,
      metadata: event.metadata,
      createdAt: new Date(event.createdAt)
    });
  } else {
    state().billingEvents.unshift(event);
  }
}

export async function createProject(actor: Actor, briefInput: ProjectBriefInput, options: CreateProjectOptions = {}) {
  const db = database();
  await ensureActor(actor, db);
  const brief = projectBriefSchema.parse(briefInput);
  const timestamp = now();
  const accessType = options.accessType ?? "free_preview";
  const paidPackStatus: PaidPackStatus = accessType === "paid_pack" ? options.paidPackStatus ?? "pending" : options.paidPackStatus ?? "none";

  if (accessType === "free_preview" && (await hasUsedFreePreview(actor))) {
    throw new BusinessRuleError("free_preview_already_used", "This customer has already used their free 3-name preview.");
  }

  const project: Project = {
    id: crypto.randomUUID(),
    ownerUserId: actor.userId,
    orgId: actor.orgId,
    name: brief.thing,
    brief,
    accessType,
    paidPackStatus,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  if (db) {
    try {
      await db.insert(dbSchema.projects).values({
        id: project.id,
        ownerUserId: project.ownerUserId,
        orgId: project.orgId,
        name: project.name,
        brief: project.brief,
        accessType: project.accessType,
        paidPackStatus: project.paidPackStatus,
        status: project.status,
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp)
      });

      if (accessType === "free_preview") {
        await db.insert(dbSchema.freePreviewClaims).values({
          id: crypto.randomUUID(),
          userId: actor.userId,
          orgId: actor.orgId,
          anonSessionHash: actor.anonSessionHash,
          projectId: project.id,
          createdAt: new Date(timestamp)
        });
        await insertBillingEvent(db, billingEventForProject(actor, project, "free_preview"));
      }

      if (accessType === "paid_pack") {
        await db.insert(dbSchema.projectPacks).values({
          id: crypto.randomUUID(),
          projectId: project.id,
          ownerUserId: actor.userId,
          orgId: actor.orgId,
          status: paidPackStatus === "paid" ? "paid" : "pending",
          provider: "placeholder",
          amountCents: PRODUCT_OFFER.paidPassPriceCents,
          currency: "usd",
          createdAt: new Date(timestamp),
          updatedAt: new Date(timestamp)
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("free_preview_claims")) {
        throw new BusinessRuleError("free_preview_already_used", "This customer has already used their free 3-name preview.");
      }
      throw error;
    }
  } else {
    const store = state();
    store.projects.unshift(project);
    if (accessType === "free_preview") {
      store.freePreviewClaims.push({
        id: crypto.randomUUID(),
        userId: actor.userId,
        orgId: actor.orgId,
        anonSessionHash: actor.anonSessionHash,
        projectId: project.id,
        createdAt: timestamp
      });
      store.billingEvents.unshift(billingEventForProject(actor, project, "free_preview"));
    }
    if (accessType === "paid_pack") {
      store.projectPacks.push({
        id: crypto.randomUUID(),
        projectId: project.id,
        ownerUserId: actor.userId,
        orgId: actor.orgId,
        status: paidPackStatus === "paid" ? "paid" : "pending",
        provider: "placeholder",
        amountCents: PRODUCT_OFFER.paidPassPriceCents,
        currency: "usd",
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
  }

  const audit = createAuditEvent(actor, "project.created", "project", project.id, { sensitivity: brief.sensitivity, accessType });
  const product = createProductEvent(actor.orgId, "project_created", { sensitivity: brief.sensitivity, accessType });
  if (db) {
    await db.insert(dbSchema.auditEvents).values({ ...audit, createdAt: new Date(audit.createdAt) });
    await db.insert(dbSchema.productEvents).values({ ...product, createdAt: new Date(product.createdAt) });
  } else {
    state().auditEvents.push(audit);
    state().productEvents.push(product);
  }
  return project;
}

export async function getProjectSnapshot(actor: Actor, projectId: string): Promise<ProjectSnapshot | null> {
  const db = database();
  await ensureActor(actor, db);
  if (db) {
    const [projectRow] = await db.select().from(dbSchema.projects).where(and(eq(dbSchema.projects.id, projectId), eq(dbSchema.projects.status, "active"))).limit(1);
    if (!projectRow) return null;
    const project = mapProject(projectRow);
    if (!canAccessProject(actor, project.orgId, project.ownerUserId)) return null;

    const [candidateRows, generationRows, screeningRows, resultRows, reportRows] = await Promise.all([
      db.select().from(dbSchema.candidates).where(eq(dbSchema.candidates.projectId, project.id)).orderBy(desc(dbSchema.candidates.createdAt)),
      db.select().from(dbSchema.generationRuns).where(eq(dbSchema.generationRuns.projectId, project.id)).orderBy(desc(dbSchema.generationRuns.createdAt)),
      db.select().from(dbSchema.screeningRuns).where(eq(dbSchema.screeningRuns.projectId, project.id)).orderBy(desc(dbSchema.screeningRuns.createdAt)),
      db.select().from(dbSchema.providerResults).where(eq(dbSchema.providerResults.projectId, project.id)),
      db.select().from(dbSchema.reportSnapshots).where(and(eq(dbSchema.reportSnapshots.projectId, project.id), isNull(dbSchema.reportSnapshots.deletedAt)))
    ]);

    return {
      project,
      candidates: candidateRows.map(mapCandidate),
      generationRuns: generationRows.map(mapGenerationRun),
      screeningRuns: screeningRows.map(mapScreeningRun),
      screeningResults: resultRows.map(mapScreeningResult),
      reports: reportRows.map(mapReport)
    };
  }

  const store = state();
  const project = store.projects.find((item) => item.id === projectId && item.status === "active");
  if (!project || !canAccessProject(actor, project.orgId, project.ownerUserId)) return null;
  return {
    project,
    candidates: store.candidates.filter((candidate) => candidate.projectId === project.id),
    generationRuns: store.generationRuns.filter((run) => run.projectId === project.id),
    screeningRuns: store.screeningRuns.filter((run) => run.projectId === project.id),
    screeningResults: store.screeningResults.filter((result) => result.projectId === project.id),
    reports: store.reports.filter((report) => report.projectId === project.id && !report.deletedAt)
  };
}

export async function addGenerationRun(actor: Actor, projectId: string, run: Omit<GenerationRun, "id" | "createdAt">) {
  const db = database();
  await ensureActor(actor, db);
  const snapshot = await getProjectSnapshot(actor, projectId);
  if (!snapshot) return null;
  const timestamp = now();
  const generationRun: GenerationRun = { ...run, id: crypto.randomUUID(), createdAt: timestamp };

  if (db) {
    await db.insert(dbSchema.generationRuns).values({
      id: generationRun.id,
      projectId,
      status: generationRun.status,
      model: generationRun.model,
      accessType: generationRun.accessType,
      promptVersion: generationRun.promptVersion,
      schemaVersion: generationRun.schemaVersion,
      validationStatus: generationRun.validationStatus,
      outputSnapshot: generationRun.outputSnapshot ?? null,
      costEstimateCents: generationRun.costEstimateCents,
      createdAt: new Date(timestamp),
      completedAt: generationRun.completedAt ? new Date(generationRun.completedAt) : null,
      errorMessage: generationRun.errorMessage
    });
    const audit = createAuditEvent(actor, "generation.created", "generation_run", generationRun.id, { projectId, status: generationRun.status });
    await db.insert(dbSchema.auditEvents).values({ ...audit, createdAt: new Date(audit.createdAt) });
  } else {
    const store = state();
    store.generationRuns.push(generationRun);
    store.auditEvents.push(createAuditEvent(actor, "generation.created", "generation_run", generationRun.id, { projectId, status: generationRun.status }));
  }
  return generationRun;
}

export type GenerationAccess =
  | { accessType: ProjectAccessType; count: number; existingRun?: GenerationRun }
  | { accessType: ProjectAccessType; count: number; existingRun: GenerationRun };

export function resolveGenerationAccess(snapshot: ProjectSnapshot): GenerationAccess {
  const succeededRunForAccess = (accessType: ProjectAccessType) =>
    snapshot.generationRuns.find((run) => run.accessType === accessType && run.status === "succeeded");

  if (snapshot.project.paidPackStatus === "paid") {
    return { accessType: "paid_pack", count: PRODUCT_OFFER.paidNameCount, existingRun: succeededRunForAccess("paid_pack") };
  }

  if (snapshot.project.accessType === "free_preview") {
    return { accessType: "free_preview", count: PRODUCT_OFFER.freeNameCount, existingRun: succeededRunForAccess("free_preview") };
  }

  throw new BusinessRuleError("paid_pack_required", "A paid Launch Pack is required before generating 50 names.", 402);
}

export async function replaceGeneratedCandidates(actor: Actor, projectId: string, generationRunId: string, candidates: Omit<Candidate, "id" | "projectId" | "generationRunId" | "status" | "notes" | "createdAt" | "updatedAt">[]) {
  const db = database();
  await ensureActor(actor, db);
  const snapshot = await getProjectSnapshot(actor, projectId);
  if (!snapshot) return [];
  const timestamp = now();
  const rows: Candidate[] = candidates.map((candidate) => ({
    ...candidate,
    id: crypto.randomUUID(),
    projectId,
    generationRunId,
    status: "generated",
    notes: "",
    createdAt: timestamp,
    updatedAt: timestamp
  }));

  if (db) {
    await db.insert(dbSchema.candidates).values(
      rows.map((candidate) => ({
        id: candidate.id,
        projectId,
        generationRunId,
        name: candidate.name,
        tagline: candidate.tagline,
        lane: candidate.lane,
        rationale: candidate.rationale,
        pronunciation: candidate.pronunciation,
        spellingRisk: candidate.spellingRisk,
        toneTags: candidate.toneTags,
        scores: candidate.scores,
        status: "generated" as const,
        notes: "",
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp)
      }))
    );
    const product = createProductEvent(actor.orgId, "generation_completed", { projectId, count: rows.length });
    await db.insert(dbSchema.productEvents).values({ ...product, createdAt: new Date(product.createdAt) });
  } else {
    const store = state();
    store.candidates.push(...rows);
    store.productEvents.push(createProductEvent(actor.orgId, "generation_completed", { projectId, count: rows.length }));
  }
  return rows;
}

export async function grantPaidPack(actor: Actor, projectId: string, metadata: Partial<Pick<ProjectPack, "externalCheckoutId" | "externalPaymentId" | "provider">> = {}) {
  const db = database();
  await ensureActor(actor, db);
  const snapshot = await getProjectSnapshot(actor, projectId);
  if (!snapshot) return null;
  const timestamp = now();
  const project = { ...snapshot.project, paidPackStatus: "paid" as const, updatedAt: timestamp };

  if (db) {
    await db.update(dbSchema.projects).set({ paidPackStatus: "paid", updatedAt: new Date(timestamp) }).where(eq(dbSchema.projects.id, projectId));
    const [existing] = await db.select().from(dbSchema.projectPacks).where(eq(dbSchema.projectPacks.projectId, projectId)).limit(1);
    if (existing) {
      await db
        .update(dbSchema.projectPacks)
        .set({
          status: "paid",
          provider: metadata.provider ?? existing.provider,
          externalCheckoutId: metadata.externalCheckoutId ?? existing.externalCheckoutId,
          externalPaymentId: metadata.externalPaymentId ?? existing.externalPaymentId,
          updatedAt: new Date(timestamp)
        })
        .where(eq(dbSchema.projectPacks.id, existing.id));
    } else {
      await db.insert(dbSchema.projectPacks).values({
        id: crypto.randomUUID(),
        projectId,
        ownerUserId: project.ownerUserId,
        orgId: project.orgId,
        status: "paid",
        provider: metadata.provider ?? "placeholder",
        externalCheckoutId: metadata.externalCheckoutId,
        externalPaymentId: metadata.externalPaymentId,
        amountCents: PRODUCT_OFFER.paidPassPriceCents,
        currency: "usd",
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp)
      });
    }
    await insertBillingEvent(db, billingEventForProject(actor, project, "pack_paid"));
    const audit = createAuditEvent(actor, "pack.paid", "project", project.id, { projectId });
    const productEvent = createProductEvent(actor.orgId, "pack_paid", { projectId, amountCents: PRODUCT_OFFER.paidPassPriceCents });
    await db.insert(dbSchema.auditEvents).values({ ...audit, createdAt: new Date(audit.createdAt) });
    await db.insert(dbSchema.productEvents).values({ ...productEvent, createdAt: new Date(productEvent.createdAt) });
    const [pack] = await db.select().from(dbSchema.projectPacks).where(eq(dbSchema.projectPacks.projectId, projectId)).limit(1);
    return pack ? mapProjectPack(pack) : null;
  }

  const store = state();
  const projectRow = store.projects.find((item) => item.id === projectId);
  if (!projectRow || !canAccessProject(actor, projectRow.orgId, projectRow.ownerUserId)) return null;
  projectRow.paidPackStatus = "paid";
  projectRow.updatedAt = timestamp;
  let pack = store.projectPacks.find((item) => item.projectId === projectId);
  if (pack) {
    pack.status = "paid";
    pack.provider = metadata.provider ?? pack.provider;
    pack.externalCheckoutId = metadata.externalCheckoutId ?? pack.externalCheckoutId;
    pack.externalPaymentId = metadata.externalPaymentId ?? pack.externalPaymentId;
    pack.updatedAt = timestamp;
  } else {
    pack = {
      id: crypto.randomUUID(),
      projectId,
      ownerUserId: projectRow.ownerUserId,
      orgId: projectRow.orgId,
      status: "paid",
      provider: metadata.provider ?? "placeholder",
      externalCheckoutId: metadata.externalCheckoutId,
      externalPaymentId: metadata.externalPaymentId,
      amountCents: PRODUCT_OFFER.paidPassPriceCents,
      currency: "usd",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    store.projectPacks.push(pack);
  }
  store.billingEvents.unshift(billingEventForProject(actor, projectRow, "pack_paid"));
  store.auditEvents.push(createAuditEvent(actor, "pack.paid", "project", projectId, { projectId }));
  store.productEvents.push(createProductEvent(actor.orgId, "pack_paid", { projectId, amountCents: PRODUCT_OFFER.paidPassPriceCents }));
  return pack;
}

export async function createCheckoutIntent(actor: Actor, projectId: string, status: CheckoutIntentStatus = "provider_unconfigured") {
  const db = database();
  await ensureActor(actor, db);
  const snapshot = await getProjectSnapshot(actor, projectId);
  if (!snapshot) return null;
  const timestamp = now();
  const intent: CheckoutIntent = {
    id: crypto.randomUUID(),
    projectId,
    ownerUserId: actor.userId,
    orgId: actor.orgId,
    provider: "placeholder",
    status,
    amountCents: PRODUCT_OFFER.paidPassPriceCents,
    currency: "usd",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  if (db) {
    await db.insert(dbSchema.checkoutIntents).values({
      id: intent.id,
      projectId,
      ownerUserId: actor.userId,
      orgId: actor.orgId,
      provider: intent.provider,
      status: intent.status,
      amountCents: intent.amountCents,
      currency: intent.currency,
      metadata: {},
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp)
    });
  } else {
    state().checkoutIntents.push(intent);
  }
  return intent;
}

export async function recordProviderEvent(input: {
  provider: ProjectPack["provider"];
  externalEventId: string;
  eventType: string;
  status: ProviderEventStatus;
  payloadHash: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const db = database();
  const timestamp = now();
  const event: ProviderEvent = {
    id: crypto.randomUUID(),
    provider: input.provider,
    externalEventId: input.externalEventId,
    eventType: input.eventType,
    status: input.status,
    payloadHash: input.payloadHash,
    metadata: input.metadata ?? {},
    processedAt: input.status === "processed" ? timestamp : undefined,
    createdAt: timestamp
  };

  if (db) {
    const [existing] = await db
      .select()
      .from(dbSchema.providerEvents)
      .where(and(eq(dbSchema.providerEvents.provider, input.provider), eq(dbSchema.providerEvents.externalEventId, input.externalEventId)))
      .limit(1);
    if (existing) {
      return { duplicate: true, event: existing };
    }
    await db.insert(dbSchema.providerEvents).values({
      id: event.id,
      provider: event.provider,
      externalEventId: event.externalEventId,
      eventType: event.eventType,
      status: event.status,
      payloadHash: event.payloadHash,
      metadata: event.metadata,
      processedAt: event.processedAt ? new Date(event.processedAt) : null,
      createdAt: new Date(event.createdAt)
    });
  } else {
    const store = state();
    const existing = store.providerEvents.find((item) => item.provider === input.provider && item.externalEventId === input.externalEventId);
    if (existing) return { duplicate: true, event: existing };
    store.providerEvents.push(event);
  }
  return { duplicate: false, event };
}

export async function recordAiUsageEvent(
  actor: Actor,
  input: Omit<AiUsageEvent, "id" | "ownerUserId" | "orgId" | "createdAt">
) {
  const db = database();
  await ensureActor(actor, db);
  const timestamp = now();
  const event: AiUsageEvent = {
    ...input,
    id: crypto.randomUUID(),
    ownerUserId: actor.userId,
    orgId: actor.orgId,
    createdAt: timestamp
  };

  if (db) {
    await db.insert(dbSchema.aiUsageEvents).values({
      id: event.id,
      ownerUserId: event.ownerUserId,
      orgId: event.orgId,
      projectId: event.projectId,
      generationRunId: event.generationRunId,
      provider: event.provider,
      model: event.model,
      task: event.task,
      promptVersion: event.promptVersion,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      estimatedCostMicroCents: event.estimatedCostMicroCents,
      status: event.status,
      metadata: event.metadata,
      createdAt: new Date(timestamp)
    });
  } else {
    state().aiUsageEvents.push(event);
  }
  return event;
}

export async function aiUsageMicroCentsSince(actor: Actor, sinceIso: string) {
  const db = database();
  await ensureActor(actor, db);
  if (db) {
    const rows = await db.select().from(dbSchema.aiUsageEvents).where(eq(dbSchema.aiUsageEvents.ownerUserId, actor.userId));
    return rows
      .map(mapAiUsageEvent)
      .filter((event) => event.createdAt >= sinceIso)
      .reduce((total, event) => total + event.estimatedCostMicroCents, 0);
  }
  return state().aiUsageEvents
    .filter((event) => event.ownerUserId === actor.userId && event.createdAt >= sinceIso)
    .reduce((total, event) => total + event.estimatedCostMicroCents, 0);
}

export async function assertAiBudget(actor: Actor, incomingEstimateMicroCents: number) {
  const perGenerationMax = env.AI_MAX_GENERATION_COST_CENTS * 1_000_000;
  if (incomingEstimateMicroCents > perGenerationMax) {
    throw new BusinessRuleError("ai_generation_too_expensive", "This generation would exceed the configured per-run AI budget.", 422);
  }
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const used = await aiUsageMicroCentsSince(actor, dayStart.toISOString());
  const max = env.AI_DAILY_BUDGET_CENTS * 1_000_000;
  if (used + incomingEstimateMicroCents > max) {
    throw new BusinessRuleError("ai_budget_exceeded", "The daily AI budget for this account has been reached.", 429);
  }
}

export async function getCachedProviderResults(provider: string, checkType: string, cacheKey: string) {
  const db = database();
  const current = new Date();
  if (db) {
    const [entry] = await db
      .select()
      .from(dbSchema.providerCacheEntries)
      .where(and(eq(dbSchema.providerCacheEntries.provider, provider), eq(dbSchema.providerCacheEntries.checkType, checkType), eq(dbSchema.providerCacheEntries.cacheKey, cacheKey)))
      .limit(1);
    if (!entry || entry.expiresAt <= current) return null;
    return providerResultSchema.array().parse(entry.resultPayload);
  }
  const entry = state().providerCacheEntries.find((item) => item.provider === provider && item.checkType === checkType && item.cacheKey === cacheKey);
  if (!entry || entry.expiresAt <= current.toISOString()) return null;
  return providerResultSchema.array().parse(entry.resultPayload);
}

export async function setCachedProviderResults(
  provider: string,
  checkType: string,
  cacheKey: string,
  queryHash: string,
  resultPayload: unknown,
  ttlMs: number
) {
  const db = database();
  const timestamp = now();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const parsed = providerResultSchema.array().parse(resultPayload);

  if (db) {
    await db
      .insert(dbSchema.providerCacheEntries)
      .values({
        id: crypto.randomUUID(),
        provider,
        checkType,
        cacheKey,
        queryHash,
        resultPayload: parsed,
        expiresAt: new Date(expiresAt),
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp)
      })
      .onConflictDoUpdate({
        target: [dbSchema.providerCacheEntries.provider, dbSchema.providerCacheEntries.checkType, dbSchema.providerCacheEntries.cacheKey],
        set: {
          queryHash,
          resultPayload: parsed,
          expiresAt: new Date(expiresAt),
          updatedAt: new Date(timestamp)
        }
      });
    const [entry] = await db
      .select()
      .from(dbSchema.providerCacheEntries)
      .where(and(eq(dbSchema.providerCacheEntries.provider, provider), eq(dbSchema.providerCacheEntries.checkType, checkType), eq(dbSchema.providerCacheEntries.cacheKey, cacheKey)))
      .limit(1);
    return entry ? mapProviderCacheEntry(entry) : null;
  }

  const store = state();
  const existing = store.providerCacheEntries.find((item) => item.provider === provider && item.checkType === checkType && item.cacheKey === cacheKey);
  if (existing) {
    existing.queryHash = queryHash;
    existing.resultPayload = parsed;
    existing.expiresAt = expiresAt;
    existing.updatedAt = timestamp;
    return existing;
  }
  const entry: ProviderCacheEntry = {
    id: crypto.randomUUID(),
    provider,
    checkType,
    cacheKey,
    queryHash,
    resultPayload: parsed,
    expiresAt,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  store.providerCacheEntries.push(entry);
  return entry;
}

export async function createJobRun(
  actor: Actor,
  input: {
    jobType: JobRunType;
    projectId?: string;
    idempotencyKey?: string;
    requestPayload?: unknown;
  }
) {
  const db = database();
  await ensureActor(actor, db);
  const timestamp = now();
  const job: JobRun = {
    id: crypto.randomUUID(),
    ownerUserId: actor.userId,
    orgId: actor.orgId,
    projectId: input.projectId,
    jobType: input.jobType,
    status: "queued",
    idempotencyKey: input.idempotencyKey ?? `${actor.userId}:${input.jobType}:${input.projectId ?? "none"}:${crypto.randomUUID()}`,
    requestPayload: input.requestPayload ?? {},
    attempts: 0,
    maxAttempts: 3,
    runAfter: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  if (db) {
    await db
      .insert(dbSchema.jobRuns)
      .values({
        id: job.id,
        ownerUserId: job.ownerUserId,
        orgId: job.orgId,
        projectId: job.projectId,
        jobType: job.jobType,
        status: job.status,
        idempotencyKey: job.idempotencyKey,
        requestPayload: job.requestPayload,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        runAfter: new Date(job.runAfter),
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp)
      })
      .onConflictDoNothing({ target: dbSchema.jobRuns.idempotencyKey });
    const [saved] = await db.select().from(dbSchema.jobRuns).where(eq(dbSchema.jobRuns.idempotencyKey, job.idempotencyKey)).limit(1);
    if (!saved) return job;
    if (saved.id === job.id) {
      const audit = createAuditEvent(actor, "job.queued", "job", saved.id, { jobType: saved.jobType, projectId: saved.projectId ?? null });
      await db.insert(dbSchema.auditEvents).values({ ...audit, createdAt: new Date(audit.createdAt) });
    }
    return mapJobRun(saved);
  }

  const existing = state().jobRuns.find((item) => item.idempotencyKey === job.idempotencyKey);
  if (existing) return existing;
  state().jobRuns.push(job);
  state().auditEvents.push(createAuditEvent(actor, "job.queued", "job", job.id, { jobType: job.jobType, projectId: job.projectId ?? null }));
  return job;
}

async function updateJobRun(
  actor: Actor,
  jobId: string,
  patch: Partial<Pick<JobRun, "status" | "resultPayload" | "errorMessage" | "startedAt" | "completedAt" | "lockedAt" | "lockedBy" | "runAfter">> & {
    incrementAttempts?: boolean;
    clearLock?: boolean;
    clearError?: boolean;
  }
) {
  const db = database();
  await ensureActor(actor, db);
  const timestamp = now();

  if (db) {
    const [existing] = await db.select().from(dbSchema.jobRuns).where(eq(dbSchema.jobRuns.id, jobId)).limit(1);
    if (!existing || !canAccessProject(actor, existing.orgId, existing.ownerUserId)) return null;
    await db
      .update(dbSchema.jobRuns)
      .set({
        status: patch.status,
        resultPayload: patch.resultPayload,
        errorMessage: patch.clearError ? null : patch.errorMessage,
        attempts: patch.incrementAttempts ? existing.attempts + 1 : existing.attempts,
        runAfter: patch.runAfter ? new Date(patch.runAfter) : existing.runAfter,
        lockedAt: patch.clearLock ? null : patch.lockedAt ? new Date(patch.lockedAt) : existing.lockedAt,
        lockedBy: patch.clearLock ? null : patch.lockedBy !== undefined ? patch.lockedBy : existing.lockedBy,
        startedAt: patch.startedAt ? new Date(patch.startedAt) : existing.startedAt,
        completedAt: patch.completedAt ? new Date(patch.completedAt) : existing.completedAt,
        updatedAt: new Date(timestamp)
      })
      .where(eq(dbSchema.jobRuns.id, jobId));
    const [updated] = await db.select().from(dbSchema.jobRuns).where(eq(dbSchema.jobRuns.id, jobId)).limit(1);
    if (updated && patch.status) {
      const audit = createAuditEvent(actor, `job.${patch.status}`, "job", jobId, { jobType: updated.jobType, projectId: updated.projectId ?? null });
      await db.insert(dbSchema.auditEvents).values({ ...audit, createdAt: new Date(audit.createdAt) });
    }
    return updated ? mapJobRun(updated) : null;
  }

  const job = state().jobRuns.find((item) => item.id === jobId);
  if (!job || !canAccessProject(actor, job.orgId, job.ownerUserId)) return null;
  Object.assign(job, {
    status: patch.status ?? job.status,
    resultPayload: patch.resultPayload ?? job.resultPayload,
    errorMessage: patch.clearError ? undefined : patch.errorMessage,
    attempts: patch.incrementAttempts ? job.attempts + 1 : job.attempts,
    runAfter: patch.runAfter ?? job.runAfter,
    lockedAt: patch.clearLock ? undefined : (patch.lockedAt ?? job.lockedAt),
    lockedBy: patch.clearLock ? undefined : (patch.lockedBy ?? job.lockedBy),
    startedAt: patch.startedAt ?? job.startedAt,
    completedAt: patch.completedAt ?? job.completedAt,
    updatedAt: timestamp
  });
  if (patch.status) state().auditEvents.push(createAuditEvent(actor, `job.${patch.status}`, "job", jobId, { jobType: job.jobType, projectId: job.projectId ?? null }));
  return job;
}

export function startJobRun(actor: Actor, jobId: string) {
  const timestamp = now();
  return updateJobRun(actor, jobId, { status: "running", startedAt: timestamp, incrementAttempts: true });
}

export function completeJobRun(actor: Actor, jobId: string, resultPayload: unknown = {}) {
  const timestamp = now();
  return updateJobRun(actor, jobId, { status: "succeeded", resultPayload, completedAt: timestamp, clearLock: true, clearError: true });
}

export function failJobRun(actor: Actor, jobId: string, error: unknown) {
  const timestamp = now();
  const message = error instanceof Error ? error.message : String(error);
  return updateJobRun(actor, jobId, { status: "failed", errorMessage: message.slice(0, 500), completedAt: timestamp, clearLock: true });
}

function rowsFromExecuteResult<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray((result as { rows: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export async function claimNextQueuedJobRun(workerId: string) {
  const db = database();
  const timestamp = now();

  if (db) {
    const result = await db.execute(sql<{ id: string }>`
      with next_job as (
        select id
        from ${dbSchema.jobRuns}
        where status = 'queued'
          and run_after <= now()
          and attempts < max_attempts
        order by created_at asc
        limit 1
      )
      update ${dbSchema.jobRuns}
      set status = 'running',
          attempts = attempts + 1,
          locked_at = now(),
          locked_by = ${workerId},
          started_at = coalesce(started_at, now()),
          updated_at = now()
      where id = (select id from next_job)
        and status = 'queued'
      returning id
    `);
    const [claimed] = rowsFromExecuteResult<{ id: string }>(result);
    if (!claimed) return null;
    const [row] = await db.select().from(dbSchema.jobRuns).where(eq(dbSchema.jobRuns.id, claimed.id)).limit(1);
    return row ? mapJobRun(row) : null;
  }

  const job = state()
    .jobRuns.filter((item) => item.status === "queued" && item.runAfter <= timestamp && item.attempts < item.maxAttempts)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (!job) return null;
  Object.assign(job, {
    status: "running",
    attempts: job.attempts + 1,
    lockedAt: timestamp,
    lockedBy: workerId,
    startedAt: job.startedAt ?? timestamp,
    updatedAt: timestamp
  });
  return job;
}

export async function requeueStaleJobRuns(staleBefore: Date) {
  const db = database();
  const timestamp = now();

  if (db) {
    const requeued = await db.execute(sql<{ id: string }>`
      update ${dbSchema.jobRuns}
      set status = 'queued',
          locked_at = null,
          locked_by = null,
          error_message = 'Worker lease expired; job returned to queue.',
          run_after = now(),
          updated_at = now()
      where status = 'running'
        and locked_at is not null
        and locked_at < ${staleBefore}
        and attempts < max_attempts
      returning id
    `);
    const failed = await db.execute(sql<{ id: string }>`
      update ${dbSchema.jobRuns}
      set status = 'failed',
          locked_at = null,
          locked_by = null,
          error_message = 'Worker lease expired after max attempts.',
          completed_at = now(),
          updated_at = now()
      where status = 'running'
        and locked_at is not null
        and locked_at < ${staleBefore}
        and attempts >= max_attempts
      returning id
    `);
    const requeuedIds = rowsFromExecuteResult<{ id: string }>(requeued).map((row) => row.id);
    const failedIds = rowsFromExecuteResult<{ id: string }>(failed).map((row) => row.id);
    const [requeuedRows, failedRows] = await Promise.all([
      requeuedIds.length ? db.select().from(dbSchema.jobRuns).where(inArray(dbSchema.jobRuns.id, requeuedIds)) : Promise.resolve([]),
      failedIds.length ? db.select().from(dbSchema.jobRuns).where(inArray(dbSchema.jobRuns.id, failedIds)) : Promise.resolve([])
    ]);
    return {
      requeued: requeuedRows.map(mapJobRun),
      failed: failedRows.map(mapJobRun)
    };
  }

  const requeued: JobRun[] = [];
  const failed: JobRun[] = [];
  for (const job of state().jobRuns) {
    if (job.status !== "running" || !job.lockedAt || new Date(job.lockedAt) >= staleBefore) continue;
    if (job.attempts < job.maxAttempts) {
      Object.assign(job, {
        status: "queued",
        lockedAt: undefined,
        lockedBy: undefined,
        errorMessage: "Worker lease expired; job returned to queue.",
        runAfter: timestamp,
        updatedAt: timestamp
      });
      requeued.push(job);
    } else {
      Object.assign(job, {
        status: "failed",
        lockedAt: undefined,
        lockedBy: undefined,
        errorMessage: "Worker lease expired after max attempts.",
        completedAt: timestamp,
        updatedAt: timestamp
      });
      failed.push(job);
    }
  }
  return { requeued, failed };
}

export async function listJobRuns(actor: Actor, limit = 20) {
  const db = database();
  await ensureActor(actor, db);
  const boundedLimit = Math.min(50, Math.max(1, limit));
  if (db) {
    const rows = await db
      .select()
      .from(dbSchema.jobRuns)
      .where(or(eq(dbSchema.jobRuns.ownerUserId, actor.userId), eq(dbSchema.jobRuns.orgId, actor.orgId)))
      .orderBy(desc(dbSchema.jobRuns.createdAt))
      .limit(boundedLimit);
    return rows.map(mapJobRun);
  }
  return state()
    .jobRuns.filter((job) => job.ownerUserId === actor.userId || job.orgId === actor.orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, boundedLimit);
}

export async function getJobRun(actor: Actor, jobId: string) {
  const db = database();
  await ensureActor(actor, db);
  if (db) {
    const [row] = await db.select().from(dbSchema.jobRuns).where(eq(dbSchema.jobRuns.id, jobId)).limit(1);
    if (!row || !canAccessProject(actor, row.orgId, row.ownerUserId)) return null;
    return mapJobRun(row);
  }
  const job = state().jobRuns.find((item) => item.id === jobId);
  if (!job || !canAccessProject(actor, job.orgId, job.ownerUserId)) return null;
  return job;
}

export async function updateCandidateStatus(actor: Actor, projectId: string, candidateId: string, status: CandidateStatus, notes?: string) {
  const db = database();
  await ensureActor(actor, db);
  const snapshot = await getProjectSnapshot(actor, projectId);
  if (!snapshot) return null;
  const existing = snapshot.candidates.find((item) => item.id === candidateId);
  if (!existing) return null;
  const timestamp = now();
  const updated: Candidate = { ...existing, status, notes: notes ?? existing.notes, updatedAt: timestamp };

  if (db) {
    await db.update(dbSchema.candidates).set({ status, notes: updated.notes, updatedAt: new Date(timestamp) }).where(eq(dbSchema.candidates.id, candidateId));
    const audit = createAuditEvent(actor, "candidate.updated", "candidate", candidateId, { status });
    await db.insert(dbSchema.auditEvents).values({ ...audit, createdAt: new Date(audit.createdAt) });
  } else {
    const candidate = state().candidates.find((item) => item.projectId === projectId && item.id === candidateId);
    if (!candidate) return null;
    candidate.status = status;
    candidate.notes = updated.notes;
    candidate.updatedAt = timestamp;
    state().auditEvents.push(createAuditEvent(actor, "candidate.updated", "candidate", candidate.id, { status }));
  }
  return updated;
}

export async function listSavedCandidates(actor: Actor) {
  const projects = await listProjects(actor);
  const snapshots = await Promise.all(projects.map((project) => getProjectSnapshot(actor, project.id)));
  return snapshots.flatMap((snapshot) => snapshot?.candidates.filter((candidate) => candidate.status === "saved" || candidate.status === "shortlisted") ?? []);
}

export async function addScreeningRun(actor: Actor, projectId: string, sourceMode: ScreeningRun["sourceMode"]) {
  const db = database();
  await ensureActor(actor, db);
  const snapshot = await getProjectSnapshot(actor, projectId);
  if (!snapshot) return null;
  const timestamp = now();
  const run: ScreeningRun = {
    id: crypto.randomUUID(),
    projectId,
    status: "running",
    sourceMode,
    createdAt: timestamp
  };
  if (db) {
    await db.insert(dbSchema.screeningRuns).values({ id: run.id, projectId, status: run.status, sourceMode, createdAt: new Date(timestamp) });
    const audit = createAuditEvent(actor, "screening.started", "screening_run", run.id, { sourceMode });
    await db.insert(dbSchema.auditEvents).values({ ...audit, createdAt: new Date(audit.createdAt) });
  } else {
    state().screeningRuns.push(run);
    state().auditEvents.push(createAuditEvent(actor, "screening.started", "screening_run", run.id, { sourceMode }));
  }
  return run;
}

export async function completeScreeningRun(actor: Actor, runId: string, results: Omit<ScreeningSourceResult, "id">[]) {
  const db = database();
  await ensureActor(actor, db);
  const timestamp = now();

  if (db) {
    const [runRow] = await db.select().from(dbSchema.screeningRuns).where(eq(dbSchema.screeningRuns.id, runId)).limit(1);
    if (!runRow) return null;
    const snapshot = await getProjectSnapshot(actor, runRow.projectId);
    if (!snapshot) return null;
    await db.update(dbSchema.screeningRuns).set({ status: "completed", completedAt: new Date(timestamp) }).where(eq(dbSchema.screeningRuns.id, runId));
    if (results.length) {
      await db.insert(dbSchema.providerResults).values(
        results.map((result) => ({
          ...result,
          id: crypto.randomUUID(),
          occurredAt: new Date(result.occurredAt)
        }))
      );
    }
    const audit = createAuditEvent(actor, "screening.completed", "screening_run", runId, { resultCount: results.length });
    await db.insert(dbSchema.auditEvents).values({ ...audit, createdAt: new Date(audit.createdAt) });
    const [completed] = await db.select().from(dbSchema.screeningRuns).where(eq(dbSchema.screeningRuns.id, runId)).limit(1);
    return completed ? mapScreeningRun(completed) : null;
  }

  const store = state();
  const run = store.screeningRuns.find((item) => item.id === runId);
  if (!run) return null;
  const project = store.projects.find((item) => item.id === run.projectId);
  if (!project || !canAccessProject(actor, project.orgId, project.ownerUserId)) return null;
  run.status = "completed";
  run.completedAt = timestamp;
  const rows = results.map((result) => ({ ...result, id: crypto.randomUUID() }));
  store.screeningResults.push(...rows);
  store.auditEvents.push(createAuditEvent(actor, "screening.completed", "screening_run", run.id, { resultCount: rows.length }));
  return run;
}

export async function addReportSnapshot(actor: Actor, report: Omit<ReportSnapshot, "id" | "createdAt">) {
  const db = database();
  await ensureActor(actor, db);
  const snapshot = await getProjectSnapshot(actor, report.projectId);
  if (!snapshot) return null;
  const timestamp = now();
  const row: ReportSnapshot = { ...report, id: crypto.randomUUID(), createdAt: timestamp };

  if (db) {
    await db.insert(dbSchema.reportSnapshots).values({
      id: row.id,
      projectId: row.projectId,
      format: row.format,
      markdown: row.markdown,
      candidateIds: row.candidateIds,
      disclaimerVersion: row.disclaimerVersion,
      promptVersion: row.promptVersion,
      scoringVersion: row.scoringVersion,
      screeningVersion: row.screeningVersion,
      createdAt: new Date(timestamp),
      deletedAt: row.deletedAt ? new Date(row.deletedAt) : null
    });
    const audit = createAuditEvent(actor, "report.exported", "report", row.id, { format: row.format });
    const product = createProductEvent(actor.orgId, "report_exported", { projectId: report.projectId, format: row.format });
    await db.insert(dbSchema.auditEvents).values({ ...audit, createdAt: new Date(audit.createdAt) });
    await db.insert(dbSchema.productEvents).values({ ...product, createdAt: new Date(product.createdAt) });
  } else {
    const store = state();
    store.reports.push(row);
    store.auditEvents.push(createAuditEvent(actor, "report.exported", "report", row.id, { format: row.format }));
    store.productEvents.push(createProductEvent(actor.orgId, "report_exported", { projectId: report.projectId, format: row.format }));
  }
  return row;
}

export async function getReport(actor: Actor, reportId: string) {
  const db = database();
  await ensureActor(actor, db);
  if (db) {
    const [report] = await db.select().from(dbSchema.reportSnapshots).where(and(eq(dbSchema.reportSnapshots.id, reportId), isNull(dbSchema.reportSnapshots.deletedAt))).limit(1);
    if (!report) return null;
    const snapshot = await getProjectSnapshot(actor, report.projectId);
    return snapshot ? mapReport(report) : null;
  }

  const store = state();
  const report = store.reports.find((item) => item.id === reportId && !item.deletedAt);
  if (!report) return null;
  const project = store.projects.find((item) => item.id === report.projectId);
  if (!project || !canAccessProject(actor, project.orgId, project.ownerUserId)) return null;
  return report;
}

export async function deleteReport(actor: Actor, reportId: string) {
  const db = database();
  await ensureActor(actor, db);
  const report = await getReport(actor, reportId);
  if (!report) return false;
  const timestamp = now();
  if (db) {
    await db.update(dbSchema.reportSnapshots).set({ deletedAt: new Date(timestamp), markdown: "Deleted content" }).where(eq(dbSchema.reportSnapshots.id, reportId));
    const audit = createAuditEvent(actor, "report.deleted", "report", reportId);
    await db.insert(dbSchema.auditEvents).values({ ...audit, createdAt: new Date(audit.createdAt) });
    return true;
  }
  const row = state().reports.find((item) => item.id === reportId);
  if (!row) return false;
  row.deletedAt = timestamp;
  row.markdown = "Deleted content";
  state().auditEvents.push(createAuditEvent(actor, "report.deleted", "report", reportId));
  return true;
}

export async function deleteProject(actor: Actor, projectId: string) {
  const db = database();
  await ensureActor(actor, db);
  const snapshot = await getProjectSnapshot(actor, projectId);
  if (!snapshot) return false;
  const timestamp = now();
  const redactedBrief = deletedProjectBrief();

  if (db) {
    await db.update(dbSchema.projects).set({ status: "deleted", brief: redactedBrief, updatedAt: new Date(timestamp) }).where(eq(dbSchema.projects.id, projectId));
    await db.update(dbSchema.reportSnapshots).set({ deletedAt: new Date(timestamp), markdown: "Deleted content" }).where(eq(dbSchema.reportSnapshots.projectId, projectId));
    await db
      .update(dbSchema.candidates)
      .set({
        name: "Deleted name",
        tagline: "Deleted content",
        rationale: "Deleted content",
        pronunciation: "deleted",
        toneTags: ["deleted"],
        notes: "",
        updatedAt: new Date(timestamp)
      })
      .where(eq(dbSchema.candidates.projectId, projectId));
    await db.update(dbSchema.generationRuns).set({ outputSnapshot: null }).where(eq(dbSchema.generationRuns.projectId, projectId));
    await db
      .update(dbSchema.providerResults)
      .set({ query: "deleted", matchedFields: [], summary: "Deleted content", rawPayloadHash: null })
      .where(eq(dbSchema.providerResults.projectId, projectId));
    await db.insert(dbSchema.retentionTombstones).values({ id: crypto.randomUUID(), entityType: "project", entityId: projectId, orgId: actor.orgId, reason: "user_requested_deletion", createdAt: new Date(timestamp) });
    const audit = createAuditEvent(actor, "project.deleted", "project", projectId);
    await db.insert(dbSchema.auditEvents).values({ ...audit, createdAt: new Date(audit.createdAt) });
    return true;
  }

  const store = state();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project || !canAccessProject(actor, project.orgId, project.ownerUserId)) return false;
  project.status = "deleted";
  project.brief = redactedBrief;
  project.updatedAt = timestamp;
  store.candidates.forEach((candidate) => {
    if (candidate.projectId === projectId) {
      candidate.name = "Deleted name";
      candidate.tagline = "Deleted content";
      candidate.rationale = "Deleted content";
      candidate.pronunciation = "deleted";
      candidate.toneTags = ["deleted"];
      candidate.notes = "";
      candidate.updatedAt = timestamp;
    }
  });
  store.generationRuns.forEach((run) => {
    if (run.projectId === projectId) run.outputSnapshot = undefined;
  });
  store.screeningResults.forEach((result) => {
    if (result.projectId === projectId) {
      result.query = "deleted";
      result.matchedFields = [];
      result.summary = "Deleted content";
      result.rawPayloadHash = undefined;
    }
  });
  store.reports.forEach((report) => {
    if (report.projectId === projectId) {
      report.deletedAt = timestamp;
      report.markdown = "Deleted content";
    }
  });
  store.tombstones.push({
    id: crypto.randomUUID(),
    entityType: "project",
    entityId: projectId,
    orgId: actor.orgId,
    reason: "user_requested_deletion",
    createdAt: timestamp
  });
  store.auditEvents.push(createAuditEvent(actor, "project.deleted", "project", projectId));
  return true;
}

function formatPrice(amountCents: number) {
  if (amountCents === 0) return "Free";
  return `$${(amountCents / 100).toFixed(2)}`;
}

function historyItemFromBillingEvent(event: BillingEvent): BillingHistoryItem {
  return {
    id: event.id,
    projectId: event.projectId,
    title: event.title,
    description: event.description,
    names: event.names,
    price: formatPrice(event.amountCents),
    when: new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.max(-30, Math.round((new Date(event.createdAt).getTime() - Date.now()) / 86_400_000)), "day"),
    status: event.amountCents > 0 ? "unlocked" : "free",
    createdAt: event.createdAt
  };
}

export async function getBillingSummary(actor: Actor, limit = 5, cursor?: string): Promise<BillingSummary> {
  const db = database();
  await ensureActor(actor, db);
  const boundedLimit = Math.min(25, Math.max(1, limit));
  if (db) {
    const where = cursor
      ? and(or(eq(dbSchema.billingEvents.ownerUserId, actor.userId), eq(dbSchema.billingEvents.orgId, actor.orgId)), lt(dbSchema.billingEvents.createdAt, new Date(cursor)))
      : or(eq(dbSchema.billingEvents.ownerUserId, actor.userId), eq(dbSchema.billingEvents.orgId, actor.orgId));
    const rows = await db.select().from(dbSchema.billingEvents).where(where).orderBy(desc(dbSchema.billingEvents.createdAt)).limit(boundedLimit + 1);
    const [packRow] = await db
      .select()
      .from(dbSchema.projectPacks)
      .where(and(or(eq(dbSchema.projectPacks.ownerUserId, actor.userId), eq(dbSchema.projectPacks.orgId, actor.orgId)), eq(dbSchema.projectPacks.status, "paid")))
      .orderBy(desc(dbSchema.projectPacks.updatedAt))
      .limit(1);
    const currentProject = packRow ? await getProjectSnapshot(actor, packRow.projectId) : null;
    const visible = rows.slice(0, boundedLimit).map((row) =>
      historyItemFromBillingEvent({
        id: row.id,
        ownerUserId: row.ownerUserId,
        orgId: row.orgId,
        projectId: row.projectId ?? undefined,
        eventType: row.eventType,
        title: row.title,
        description: row.description,
        names: row.names,
        amountCents: row.amountCents,
        currency: "usd",
        metadata: {},
        createdAt: row.createdAt.toISOString()
      })
    );
    return {
      currentPack:
        packRow && currentProject
          ? {
              projectId: packRow.projectId,
              projectName: currentProject.project.name,
              names: PRODUCT_OFFER.paidNameCount,
              price: PRODUCT_OFFER.paidPassPriceLong,
              status: "unlocked"
            }
          : undefined,
      history: visible,
      nextCursor: rows.length > boundedLimit ? rows[boundedLimit - 1]?.createdAt.toISOString() : undefined,
      total: rows.length
    };
  }

  const events = state()
    .billingEvents.filter((event) => event.ownerUserId === actor.userId || event.orgId === actor.orgId)
    .filter((event) => !cursor || event.createdAt < cursor)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const paidPack = state()
    .projectPacks.filter((pack) => pack.status === "paid" && (pack.ownerUserId === actor.userId || pack.orgId === actor.orgId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const currentProject = paidPack ? state().projects.find((project) => project.id === paidPack.projectId) : undefined;
  const visible = events.slice(0, boundedLimit);
  return {
    currentPack:
      paidPack && currentProject
        ? {
            projectId: paidPack.projectId,
            projectName: currentProject.name,
            names: PRODUCT_OFFER.paidNameCount,
            price: PRODUCT_OFFER.paidPassPriceLong,
            status: "unlocked"
          }
        : undefined,
    history: visible.map(historyItemFromBillingEvent),
    nextCursor: events.length > boundedLimit ? visible.at(-1)?.createdAt : undefined,
    total: events.length
  };
}

export async function getAiUsageSummary(actor: Actor): Promise<AiUsageSummary> {
  const db = database();
  await ensureActor(actor, db);
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayStartIso = dayStart.toISOString();
  const rows = db
    ? (await db.select().from(dbSchema.aiUsageEvents).where(or(eq(dbSchema.aiUsageEvents.ownerUserId, actor.userId), eq(dbSchema.aiUsageEvents.orgId, actor.orgId)))).map(
        mapAiUsageEvent
      )
    : state().aiUsageEvents.filter((event) => event.ownerUserId === actor.userId || event.orgId === actor.orgId);
  const daily = rows.filter((event) => event.createdAt >= dayStartIso);
  return {
    dailyEstimatedCostCents: microCentsToDisplayCents(daily.reduce((total, event) => total + event.estimatedCostMicroCents, 0)),
    totalEstimatedCostCents: microCentsToDisplayCents(rows.reduce((total, event) => total + event.estimatedCostMicroCents, 0)),
    dailyEvents: daily.length,
    totalEvents: rows.length
  };
}

export async function getJobHealth(actor: Actor): Promise<JobHealthSummary> {
  const rows = await listJobRuns(actor, 50);
  return rows.reduce<JobHealthSummary>(
    (summary, job) => {
      summary.total += 1;
      summary[job.status] += 1;
      if (!summary.latest || job.updatedAt > summary.latest) summary.latest = job.updatedAt;
      return summary;
    },
    { total: 0, queued: 0, running: 0, succeeded: 0, failed: 0 }
  );
}

export async function exportAccountData(actor: Actor) {
  const projects = await listProjects(actor);
  const [snapshots, savedNames, billing, aiUsage, jobs] = await Promise.all([
    Promise.all(projects.map((project) => getProjectSnapshot(actor, project.id))),
    listSavedCandidates(actor),
    getBillingSummary(actor, 25),
    getAiUsageSummary(actor),
    listJobRuns(actor, 25)
  ]);

  return {
    exportedAt: now(),
    actor: {
      userId: actor.userId,
      orgId: actor.orgId,
      source: actor.source,
      email: actor.email
    },
    projects: snapshots.filter(Boolean),
    savedNames,
    billing,
    aiUsage,
    jobs
  };
}

export async function deleteAccountData(actor: Actor) {
  const db = database();
  await ensureActor(actor, db);
  const projects = await listProjects(actor);
  let deletedProjects = 0;
  for (const project of projects) {
    if (await deleteProject(actor, project.id)) deletedProjects += 1;
  }

  const timestamp = now();
  const tombstone: RetentionTombstone = {
    id: crypto.randomUUID(),
    entityType: "account",
    entityId: actor.userId,
    orgId: actor.orgId,
    reason: "user_requested_account_deletion",
    createdAt: timestamp
  };

  if (db) {
    await db.update(dbSchema.users).set({ email: null, updatedAt: new Date(timestamp) }).where(eq(dbSchema.users.id, actor.userId));
    await db.insert(dbSchema.retentionTombstones).values({ ...tombstone, createdAt: new Date(timestamp) });
    const audit = createAuditEvent(actor, "account.deleted", "account", actor.userId, { deletedProjects });
    await db.insert(dbSchema.auditEvents).values({ ...audit, createdAt: new Date(audit.createdAt) });
  } else {
    state().tombstones.push(tombstone);
    state().auditEvents.push(createAuditEvent(actor, "account.deleted", "account", actor.userId, { deletedProjects }));
  }

  return { deletedProjects, tombstone };
}

export async function assertRateLimit(actor: Actor, scope: string, limit: number, windowMs: number) {
  const db = database();
  const key = `${scope}:${actor.userId}`;
  const currentTime = Date.now();
  const resetAt = new Date(currentTime + windowMs);
  if (db) {
    const [bucket] = await db.select().from(dbSchema.rateLimitBuckets).where(eq(dbSchema.rateLimitBuckets.key, key)).limit(1);
    if (!bucket || bucket.resetAt.getTime() <= currentTime) {
      await db
        .insert(dbSchema.rateLimitBuckets)
        .values({ key, count: 1, resetAt, updatedAt: new Date() })
        .onConflictDoUpdate({ target: dbSchema.rateLimitBuckets.key, set: { count: 1, resetAt, updatedAt: new Date() } });
      return;
    }
    if (bucket.count >= limit) throw new BusinessRuleError("rate_limited", "Too many requests. Try again shortly.", 429);
    await db.update(dbSchema.rateLimitBuckets).set({ count: bucket.count + 1, updatedAt: new Date() }).where(eq(dbSchema.rateLimitBuckets.key, key));
    return;
  }

  const store = state();
  const bucket = store.rateLimitBuckets.find((item) => item.key === key);
  if (!bucket || new Date(bucket.resetAt).getTime() <= currentTime) {
    const next: RateLimitBucket = { key, count: 1, resetAt: resetAt.toISOString(), updatedAt: now() };
    if (bucket) Object.assign(bucket, next);
    else store.rateLimitBuckets.push(next);
    return;
  }
  if (bucket.count >= limit) throw new BusinessRuleError("rate_limited", "Too many requests. Try again shortly.", 429);
  bucket.count += 1;
  bucket.updatedAt = now();
}

export async function getProviderHealth() {
  const db = database();
  if (db) {
    const rows = await db.select().from(dbSchema.providerResults);
    const byProvider = new Map<string, { provider: string; total: number; failures: number; latest?: string }>();
    for (const result of rows) {
      const entry = byProvider.get(result.provider) ?? { provider: result.provider, total: 0, failures: 0 };
      entry.total += 1;
      if (result.label === "provider_error" || result.label === "source_unavailable") entry.failures += 1;
      entry.latest = result.occurredAt.toISOString();
      byProvider.set(result.provider, entry);
    }
    return Array.from(byProvider.values());
  }
  const byProvider = new Map<string, { provider: string; total: number; failures: number; latest?: string }>();
  for (const result of state().screeningResults) {
    const entry = byProvider.get(result.provider) ?? { provider: result.provider, total: 0, failures: 0 };
    entry.total += 1;
    if (result.label === "provider_error" || result.label === "source_unavailable") entry.failures += 1;
    entry.latest = result.occurredAt;
    byProvider.set(result.provider, entry);
  }
  return Array.from(byProvider.values());
}

export function resetStoreForTests() {
  if (hasDatabaseConfig) throw new Error("resetStoreForTests only resets the local in-memory fallback.");
  globalForStore.nameMyStartupStore = undefined;
}
