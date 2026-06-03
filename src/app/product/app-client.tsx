"use client";

import { SignIn, SignUp, useClerk, useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Bookmark,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Briefcase,
  Camera,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  Folder,
  Globe,
  Lock,
  LogOut,
  Music2,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  User,
  Video,
  Waves,
  X,
  Zap,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT_OFFER } from "@/lib/product-offer";
import { clampScore, screeningReviewWeight } from "@/lib/scoring";
import { SCREENING_LABEL_COPY, type ScreeningLabel } from "@/lib/screening";
import type { BillingSummary, Candidate, JobRun, Project, ProjectSnapshot, ReportSnapshot, ScreeningRun, ScreeningSourceResult } from "@/lib/types";
import type { ProjectBriefInput } from "@/lib/schemas";
import {
  DEMO_PROJECTS,
  NAMES,
  RESULT_STYLES,
  STYLE_OPTIONS,
  scoreTone,
  type BriefStyle,
  type DemoProject,
  type EvidenceReport,
  type NameItem,
  type NameStyle
} from "./namelift-data";
import styles from "./app.module.css";

type RouteKey =
  | "brief"
  | "generating"
  | "results"
  | "checkout"
  | "success"
  | "dashboard"
  | "saved"
  | "settings"
  | "billing"
  | "login"
  | "signup"
  | "reports"
  | "report"
  | "shortlist";

type ProductScreen = RouteKey | "vibe";
type PayIntent = "unlockCurrent" | "newSprint" | null;
type CSSVarStyle = CSSProperties & Record<`--${string}`, string | number>;

type PendingBrief = {
  projectId: string;
  title: string;
  brief: string;
  styles: BriefStyle[];
};

type ActiveSprint = PendingBrief & {
  paidSprint: boolean;
};

type StoredProject = {
  id: string;
  title: string;
  brief: string;
  count: 3 | 50;
  status: "free" | "unlocked";
  when: string;
  tileColor: string;
  iconKey: "waves" | "sparkles" | "bolt" | "star" | "file";
};

type NameliftState = {
  authed: boolean;
  freeUsed: boolean;
  saved: string[];
  selected: string | null;
  unlockedProjects: string[];
  currentProjectId: string;
  title: string;
  brief: string;
  styles: BriefStyle[];
  afterAuth: RouteKey | null;
  payIntent: PayIntent;
  pendingBrief: PendingBrief | null;
  activeSprint: ActiveSprint | null;
  projects: StoredProject[];
  candidatesByProject: Record<string, NameItem[]>;
  screeningRunsByProject: Record<string, ScreeningRun[]>;
  screeningResultsByProject: Record<string, ScreeningSourceResult[]>;
  reportsByProject: Record<string, ReportSnapshot[]>;
  billingHistory: BillingHistoryItem[];
  billingCursor: string | null;
  billingTotal: number;
  currentPack: BillingSummary["currentPack"] | null;
};

type Toast = {
  id: string;
  message: string;
  icon: LucideIcon;
};

type OverlayProps = {
  overlay?: boolean;
};

type SharedProps = {
  state: NameliftState;
  setState: Dispatch<SetStateAction<NameliftState>>;
  go: (route: RouteKey, patch?: Partial<NameliftState>) => void;
  goLanding: () => void;
  onToast: (message: string, icon?: LucideIcon) => void;
  authSession: AuthSession;
};

type AuthSession = {
  clerkEnabled: boolean;
  loaded: boolean;
  signedIn: boolean;
  displayName?: string;
  email?: string;
  initials: string;
  signOut?: () => Promise<void>;
};

const STORAGE_KEY = "namelift:internal-flow:v3";
const e2eClerkDisabled = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_E2E_DISABLE_CLERK === "true";
const clerkClientEnabled = !e2eClerkDisabled && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const DEFAULT_PROJECT_ID = "demo-sprint";
const freeNameBatch = PRODUCT_OFFER.freeNameCount;
const paidNameBatch = PRODUCT_OFFER.paidNameCount;
const paidPageSize = 12;
const launchPrice = PRODUCT_OFFER.paidPassPrice;
const launchPriceLong = PRODUCT_OFFER.paidPassPriceLong;
const EMPTY_NAME_ITEMS: NameItem[] = [];

type LockedTeaserRow = {
  name: string;
  tagline: string;
  style: NameStyle;
  score: number;
  checks: readonly string[];
  accent: string;
  bg: string;
};

type BillingHistoryItem = {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  names: number;
  price: string;
  when: string;
  status: "free" | "unlocked";
  createdAt?: string;
};

type AsyncStatus = "idle" | "loading" | "ready" | "error";
type AvailabilityStatus = "clear" | "review" | "not_checked";

type EvidenceSource = Pick<
  ScreeningSourceResult,
  "id" | "provider" | "checkType" | "label" | "confidence" | "source" | "query" | "summary" | "freshness" | "occurredAt"
>;

type BackendEvidence = {
  sourceMode?: ScreeningRun["sourceMode"];
  runStatus?: ScreeningRun["status"];
  reportId?: string;
  reportCreatedAt?: string;
  providerCount: number;
  sources: EvidenceSource[];
};

type EvidenceNameItem = NameItem & {
  backendEvidence?: BackendEvidence;
};

type ProjectEvidenceContext = {
  useBackendEvidence: boolean;
  screeningResults?: ScreeningSourceResult[];
  latestRun?: ScreeningRun;
  latestReport?: ReportSnapshot;
};

// Visual decoys only. Keep locked teasers detached from NAMES so paid results are never present in the free DOM.
const LOCKED_TEASER_ROWS: LockedTeaserRow[] = [
  {
    name: "Asterlane",
    tagline: "Polished, modern, easy to launch.",
    style: "Modern",
    score: 92,
    checks: [".com open", "@ handle"],
    accent: "#0f8f7e",
    bg: "rgba(15, 143, 126, 0.12)"
  },
  {
    name: "MotiveRow",
    tagline: "Confident, practical, product-led.",
    style: "Premium",
    score: 89,
    checks: [".io open", "low conflict"],
    accent: "#1f9d7a",
    bg: "rgba(31, 157, 122, 0.12)"
  },
  {
    name: "Bluecap",
    tagline: "Short, memorable, category-flexible.",
    style: "Playful",
    score: 86,
    checks: [".co open", "@ clean"],
    accent: "#1f6bff",
    bg: "rgba(31, 107, 255, 0.12)"
  },
  {
    name: "Koralist",
    tagline: "Ownable sound with a premium edge.",
    style: "Abstract",
    score: 83,
    checks: [".net open", "watchlist"],
    accent: "#f07a2b",
    bg: "rgba(240, 122, 43, 0.13)"
  }
];

const defaultState: NameliftState = {
  authed: false,
  freeUsed: false,
  saved: [],
  selected: null,
  unlockedProjects: [],
  currentProjectId: DEFAULT_PROJECT_ID,
  title: "Budgeting app for freelancers",
  brief: "A calm budgeting app for freelancers",
  styles: ["Modern"],
  afterAuth: null,
  payIntent: null,
  pendingBrief: null,
  activeSprint: null,
  projects: [],
  candidatesByProject: {},
  screeningRunsByProject: {},
  screeningResultsByProject: {},
  reportsByProject: {},
  billingHistory: [],
  billingCursor: null,
  billingTotal: 0,
  currentPack: null
};

const exampleBriefs = [
  "A calm budgeting app for freelancers",
  "B2B platform for warehouse robotics",
  "A premium coffee subscription"
];

const generationSteps = [
  { label: "Reading your brief", icon: Cpu },
  { label: "Generating candidate names", icon: Sparkles },
  { label: "Checking .com / .net / .io", icon: Globe },
  { label: "Scanning public web + social signals", icon: Sparkles },
  { label: "Cross-checking trademark signals", icon: Shield }
];

const iconByKey: Record<StoredProject["iconKey"], LucideIcon> = {
  waves: Waves,
  sparkles: Sparkles,
  bolt: Zap,
  star: Star,
  file: FileText
};

const resultIconOptions = [Sparkles, Waves, Star, Cpu, Shield, Zap];
const routeKeys: RouteKey[] = [
  "brief",
  "generating",
  "results",
  "checkout",
  "success",
  "dashboard",
  "saved",
  "settings",
  "billing",
  "login",
  "signup",
  "reports",
  "report",
  "shortlist"
];
const routeKeySet = new Set<RouteKey>(routeKeys);
const payIntentSet = new Set<NonNullable<PayIntent>>(["unlockCurrent", "newSprint"]);
const projectIconKeySet = new Set<StoredProject["iconKey"]>(["waves", "sparkles", "bolt", "star", "file"]);
const briefStyleSet = new Set<BriefStyle>(STYLE_OPTIONS.map((item) => item.key));

const socialIcons: Array<[keyof EvidenceReport["socials"], string, LucideIcon]> = [
  ["x", "X", X],
  ["instagram", "Instagram", Camera],
  ["tiktok", "TikTok", Music2],
  ["linkedin", "LinkedIn", Briefcase],
  ["youtube", "YouTube", Video]
];

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

function truncateTitle(value: string) {
  const clean = value.trim();
  if (!clean) return "Untitled startup";
  return clean.length > 38 ? `${clean.slice(0, 38)}...` : clean;
}

function newProjectId() {
  return `sprint-${Date.now().toString(36)}`;
}

function isLocalProjectId(projectId: string) {
  return projectId.startsWith("sprint-");
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringProp(value: Record<string, unknown>, key: string, fallback = "") {
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : fallback;
}

function routeOrNull(value: unknown): RouteKey | null {
  return typeof value === "string" && routeKeySet.has(value as RouteKey) ? (value as RouteKey) : null;
}

function payIntentOrNull(value: unknown): PayIntent {
  return typeof value === "string" && payIntentSet.has(value as NonNullable<PayIntent>) ? (value as NonNullable<PayIntent>) : null;
}

function sanitizeBriefStyles(value: unknown): BriefStyle[] {
  if (!Array.isArray(value)) return ["Modern"];
  const styles = value.filter((item): item is BriefStyle => typeof item === "string" && briefStyleSet.has(item as BriefStyle));
  return styles.length > 0 ? styles : ["Modern"];
}

function sanitizePendingBrief(value: unknown): PendingBrief | null {
  const record = objectRecord(value);
  if (!record) return null;
  const projectId = stringProp(record, "projectId").trim();
  const title = stringProp(record, "title").trim();
  const brief = stringProp(record, "brief").trim();
  if (!projectId || !title || !brief) return null;
  return {
    projectId,
    title,
    brief,
    styles: sanitizeBriefStyles(record.styles)
  };
}

function sanitizeActiveSprint(value: unknown): ActiveSprint | null {
  const pending = sanitizePendingBrief(value);
  const record = objectRecord(value);
  if (!pending || !record) return null;
  return {
    ...pending,
    paidSprint: record.paidSprint === true
  };
}

function sanitizeStoredProject(value: unknown): StoredProject | null {
  const record = objectRecord(value);
  if (!record) return null;
  const id = stringProp(record, "id").trim();
  const title = stringProp(record, "title").trim();
  const brief = stringProp(record, "brief").trim();
  if (!id || !title || !brief) return null;
  const count = record.count === 50 ? 50 : 3;
  const status = record.status === "unlocked" ? "unlocked" : "free";
  const iconKey = typeof record.iconKey === "string" && projectIconKeySet.has(record.iconKey as StoredProject["iconKey"]) ? (record.iconKey as StoredProject["iconKey"]) : "sparkles";
  return {
    id,
    title,
    brief,
    count,
    status,
    when: stringProp(record, "when", "Recent"),
    tileColor: stringProp(record, "tileColor", "--tile-blue"),
    iconKey
  };
}

function sanitizeBillingHistoryItem(value: unknown): BillingHistoryItem | null {
  const record = objectRecord(value);
  if (!record) return null;
  const id = stringProp(record, "id").trim();
  const title = stringProp(record, "title").trim();
  const description = stringProp(record, "description").trim();
  const price = stringProp(record, "price").trim();
  const when = stringProp(record, "when").trim();
  if (!id || !title || !description || !price || !when) return null;
  return {
    id,
    projectId: stringProp(record, "projectId") || undefined,
    title,
    description,
    names: typeof record.names === "number" && Number.isFinite(record.names) ? record.names : freeNameBatch,
    price,
    when,
    status: record.status === "unlocked" ? "unlocked" : "free",
    createdAt: stringProp(record, "createdAt") || undefined
  };
}

function sanitizeCurrentPack(value: unknown): BillingSummary["currentPack"] | null {
  const record = objectRecord(value);
  if (!record) return null;
  const projectId = stringProp(record, "projectId").trim();
  const projectName = stringProp(record, "projectName").trim();
  const price = stringProp(record, "price").trim();
  if (!projectId || !projectName || !price) return null;
  return {
    projectId,
    projectName,
    names: typeof record.names === "number" && Number.isFinite(record.names) ? record.names : paidNameBatch,
    price,
    status: "unlocked"
  };
}

function normalizeState(value: unknown): NameliftState {
  if (!value || typeof value !== "object") return defaultState;
  const partial = value as Partial<NameliftState>;
  const record = value as Record<string, unknown>;
  const candidatesByProject =
    partial.candidatesByProject && typeof partial.candidatesByProject === "object"
      ? Object.fromEntries(
          Object.entries(partial.candidatesByProject).map(([projectIdValue, items]) => [
            projectIdValue,
            Array.isArray(items)
              ? items.map((item, index) => ({
                  ...item,
                  icon: typeof item.icon === "function" ? item.icon : resultIconOptions[index % resultIconOptions.length]
                }))
              : []
          ])
        )
      : {};
  const screeningRunsByProject =
    partial.screeningRunsByProject && typeof partial.screeningRunsByProject === "object" ? partial.screeningRunsByProject : {};
  const screeningResultsByProject =
    partial.screeningResultsByProject && typeof partial.screeningResultsByProject === "object" ? partial.screeningResultsByProject : {};
  const reportsByProject = partial.reportsByProject && typeof partial.reportsByProject === "object" ? partial.reportsByProject : {};
  return {
    ...defaultState,
    authed: partial.authed === true,
    freeUsed: partial.freeUsed === true,
    saved: Array.isArray(partial.saved) ? partial.saved.filter((item): item is string => typeof item === "string") : [],
    selected: typeof partial.selected === "string" ? partial.selected : null,
    unlockedProjects: Array.isArray(partial.unlockedProjects) ? partial.unlockedProjects.filter((item): item is string => typeof item === "string") : [],
    currentProjectId: stringProp(record, "currentProjectId", defaultState.currentProjectId).trim() || defaultState.currentProjectId,
    title: stringProp(record, "title", defaultState.title).trim() || defaultState.title,
    brief: stringProp(record, "brief", defaultState.brief).trim() || defaultState.brief,
    styles: sanitizeBriefStyles(partial.styles),
    afterAuth: routeOrNull(partial.afterAuth),
    payIntent: payIntentOrNull(partial.payIntent),
    pendingBrief: sanitizePendingBrief(partial.pendingBrief),
    activeSprint: sanitizeActiveSprint(partial.activeSprint),
    projects: Array.isArray(partial.projects) ? partial.projects.map(sanitizeStoredProject).filter((project): project is StoredProject => Boolean(project)) : [],
    candidatesByProject,
    screeningRunsByProject,
    screeningResultsByProject,
    reportsByProject,
    billingHistory: Array.isArray(partial.billingHistory) ? partial.billingHistory.map(sanitizeBillingHistoryItem).filter((item): item is BillingHistoryItem => Boolean(item)) : [],
    billingCursor: typeof partial.billingCursor === "string" ? partial.billingCursor : null,
    billingTotal: typeof partial.billingTotal === "number" ? partial.billingTotal : 0,
    currentPack: sanitizeCurrentPack(partial.currentPack)
  };
}

function localDraftState(state: NameliftState): Partial<NameliftState> {
  return {
    authed: clerkClientEnabled ? false : state.authed,
    selected: state.selected,
    currentProjectId: state.currentProjectId,
    title: state.title,
    brief: state.brief,
    styles: state.styles,
    afterAuth: state.afterAuth,
    payIntent: state.payIntent,
    pendingBrief: state.pendingBrief,
    activeSprint: state.activeSprint
  };
}

function readStoredDraftState() {
  if (typeof window === "undefined") return defaultState;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState;
    return normalizeState(localDraftState(normalizeState(JSON.parse(stored))));
  } catch {
    return defaultState;
  }
}

function writeStoredDraftState(state: NameliftState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localDraftState(state)));
  } catch {
    // Private browsing and storage restrictions should not block the product flow.
  }
}

function usePersistentState() {
  const [state, setBaseState] = useState<NameliftState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredDraftState();
    setBaseState((current) => normalizeState({ ...current, ...localDraftState(stored) }));
    writeStoredDraftState(stored);
    setHydrated(true);
  }, []);

  const setState = useCallback<Dispatch<SetStateAction<NameliftState>>>((updater) => {
    setBaseState((current) => {
      const next = typeof updater === "function" ? (updater as (value: NameliftState) => NameliftState)(current) : updater;
      writeStoredDraftState(next);
      return next;
    });
  }, []);

  return [state, setState, hydrated] as const;
}

function pathFor(route: RouteKey, state: NameliftState) {
  const projectId = state.currentProjectId || DEFAULT_PROJECT_ID;
  if (route === "brief") return state.authed ? "/app/new/describe" : "/start";
  if (route === "generating") return "/app/new/generating";
  if (route === "results") return `/app/projects/${projectId}/results`;
  if (route === "checkout") return "/checkout/launch-pack";
  if (route === "success") return "/checkout/launch-pack?success=1";
  if (route === "dashboard") return "/app";
  if (route === "saved") return "/app/saved";
  if (route === "settings") return "/app/settings";
  if (route === "billing") return "/app/billing";
  if (route === "login") return "/login";
  if (route === "signup") return "/signup";
  if (route === "reports") return "/app/reports";
  if (route === "report") return `/app/projects/${projectId}/names/${state.selected || "n0"}/report`;
  if (route === "shortlist") return `/app/projects/${projectId}/shortlist`;
  return "/start";
}

function upsertProject(projects: StoredProject[], project: StoredProject) {
  const without = projects.filter((item) => item.id !== project.id);
  return [project, ...without];
}

function projectFromSprint(sprint: ActiveSprint, status: "free" | "unlocked"): StoredProject {
  return {
    id: sprint.projectId,
    title: sprint.title,
    brief: sprint.brief,
    count: status === "unlocked" ? 50 : 3,
    status,
    when: "Just now",
    tileColor: status === "unlocked" ? "--tile-blue" : "--tile-orange",
    iconKey: status === "unlocked" ? "bolt" : "sparkles"
  };
}

function projectFromApi(project: Project): StoredProject {
  const unlocked = project.paidPackStatus === "paid";
  return {
    id: project.id,
    title: project.name,
    brief: project.brief.description,
    count: unlocked ? paidNameBatch : freeNameBatch,
    status: unlocked ? "unlocked" : "free",
    when: relativeWhen(project.createdAt),
    tileColor: unlocked ? "--tile-blue" : "--tile-orange",
    iconKey: unlocked ? "bolt" : "sparkles"
  };
}

function relativeWhen(value: string) {
  const days = Math.round((new Date(value).getTime() - Date.now()) / 86_400_000);
  if (!Number.isFinite(days) || Math.abs(days) < 1) return "Today";
  if (days === -1) return "Yesterday";
  if (days > -7) return `${Math.abs(days)}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function lanesForStyles(stylesValue: BriefStyle[]) {
  const laneSet = new Set<ProjectBriefInput["lanes"][number]>();
  stylesValue.forEach((style) => {
    if (style === "Modern") {
      laneSet.add("descriptive");
      laneSet.add("compound");
    }
    if (style === "Playful") laneSet.add("playful");
    if (style === "Professional") laneSet.add("premium");
    if (style === "Bold") laneSet.add("technical");
    if (style === "Minimal") laneSet.add("minimal");
    if (style === "Invented") laneSet.add("invented");
  });
  if (!laneSet.size) laneSet.add("descriptive");
  return Array.from(laneSet);
}

function briefForApi(title: string, brief: string, stylesValue: BriefStyle[]): ProjectBriefInput {
  return {
    thing: truncateTitle(title || brief),
    description: brief,
    audience: "early customers",
    category: truncateTitle(title || brief),
    geography: "United States",
    tone: stylesValue.join(", ") || "Modern",
    requiredWords: [],
    forbiddenWords: [],
    competitors: [],
    tlds: [".com", ".net", ".io"],
    lanes: lanesForStyles(stylesValue),
    sensitivity: "standard"
  };
}

function averageScore(candidate: Candidate) {
  const values = Object.values(candidate.scores);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function evidenceAdjustedScore(candidate: Candidate, results: ScreeningSourceResult[]) {
  if (!results.length) return averageScore(candidate);
  const reviewPenalty = screeningReviewWeight(results.map((result) => result.label));
  const clearSignals = results.filter((result) => isClearScreeningLabel(result.label)).length;
  return clampScore(averageScore(candidate) - Math.min(34, Math.round(reviewPenalty * 0.45)) + Math.min(6, clearSignals));
}

function emptyBackendReport(): EvidenceReport {
  return {
    domains: { com: false, net: false, io: false },
    socials: { x: false, instagram: false, tiktok: false, linkedin: false, youtube: false },
    trademark: "review"
  };
}

function reportSeed(value: string) {
  return value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function reportForCandidate(candidate: Candidate): EvidenceReport {
  const seed = reportSeed(candidate.id);
  const score = averageScore(candidate);
  const threshold = score > 84 ? 3 : score > 76 ? 2 : 1;
  return {
    domains: {
      com: seed % 5 < threshold,
      net: seed % 7 < threshold + 1,
      io: seed % 11 < threshold + 2
    },
    socials: {
      x: seed % 2 === 0,
      instagram: seed % 3 !== 0,
      tiktok: seed % 5 !== 0,
      linkedin: seed % 7 !== 0,
      youtube: seed % 11 !== 0
    },
    trademark: seed % 6 === 0 ? "review" : "clear"
  };
}

function isClearScreeningLabel(label: ScreeningLabel) {
  return label === "no_obvious_conflict_found_in_this_screen";
}

function isReviewScreeningLabel(label: ScreeningLabel) {
  return !isClearScreeningLabel(label);
}

function latestScreeningRun(runs: ScreeningRun[] = []) {
  return [...runs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function latestReportSnapshot(reports: ReportSnapshot[] = []) {
  return [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function evidenceForCandidate(candidateId: string, context?: ProjectEvidenceContext): BackendEvidence | undefined {
  if (!context?.useBackendEvidence) return undefined;
  const sources = (context.screeningResults ?? [])
    .filter((result) => result.candidateId === candidateId)
    .map(
      (result): EvidenceSource => ({
        id: result.id,
        provider: result.provider,
        checkType: result.checkType,
        label: result.label,
        confidence: result.confidence,
        source: result.source,
        query: result.query,
        summary: result.summary,
        freshness: result.freshness,
        occurredAt: result.occurredAt
      })
    );
  return {
    sourceMode: context.latestRun?.sourceMode,
    runStatus: context.latestRun?.status,
    reportId: context.latestReport?.id,
    reportCreatedAt: context.latestReport?.createdAt,
    providerCount: sources.length,
    sources
  };
}

function reportFromScreeningResults(candidateName: string, results: ScreeningSourceResult[]): EvidenceReport {
  if (!results.length) return emptyBackendReport();

  const clean = candidateName.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const domainResults = results.filter((result) => result.checkType === "domain");
  const domainFor = (tld: "com" | "net" | "io") => {
    const suffix = `.${tld}`;
    const relevant = domainResults.filter((result) => {
      const query = result.query.toLowerCase();
      return query.endsWith(suffix) || query.includes(`${clean}${suffix}`);
    });
    return relevant.length > 0 && relevant.every((result) => isClearScreeningLabel(result.label));
  };

  const socialResults = results.filter((result) => result.checkType === "social");
  const socialFor = (platform: keyof EvidenceReport["socials"]) => {
    const relevant = socialResults.filter((result) => {
      const haystack = `${result.provider} ${result.source} ${result.query}`.toLowerCase();
      return haystack.includes(platform);
    });
    return relevant.length > 0 && relevant.every((result) => isClearScreeningLabel(result.label));
  };

  const trademarkResults = results.filter((result) => result.checkType === "trademark");
  const trademarkClear = trademarkResults.length > 0 && trademarkResults.every((result) => !isReviewScreeningLabel(result.label));

  return {
    domains: {
      com: domainFor("com"),
      net: domainFor("net"),
      io: domainFor("io")
    },
    socials: {
      x: socialFor("x"),
      instagram: socialFor("instagram"),
      tiktok: socialFor("tiktok"),
      linkedin: socialFor("linkedin"),
      youtube: socialFor("youtube")
    },
    trademark: trademarkClear ? "clear" : "review"
  };
}

function nameItemFromCandidate(candidate: Candidate, index: number, context?: ProjectEvidenceContext): NameItem {
  const styleByLane: Record<Candidate["lane"], NameStyle> = {
    descriptive: "Modern",
    compound: "Premium",
    invented: "Abstract",
    metaphorical: "Premium",
    technical: "Modern",
    premium: "Premium",
    playful: "Playful",
    minimal: "Modern"
  };
  const candidateResults = context?.screeningResults?.filter((result) => result.candidateId === candidate.id) ?? [];
  const backendEvidence = evidenceForCandidate(candidate.id, context);
  return {
    id: candidate.id,
    name: candidate.name,
    tagline: candidate.tagline,
    score: context?.useBackendEvidence ? evidenceAdjustedScore(candidate, candidateResults) : averageScore(candidate),
    style: styleByLane[candidate.lane] ?? "Modern",
    slug: candidate.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    tileColor: ["--tile-purple", "--tile-teal", "--tile-orange", "--tile-blue", "--tile-pink", "--tile-amber"][index % 6],
    icon: resultIconOptions[index % resultIconOptions.length],
    report: context?.useBackendEvidence ? reportFromScreeningResults(candidate.name, candidateResults) : reportForCandidate(candidate),
    ...(backendEvidence ? { backendEvidence } : {})
  };
}

function nameItemsFromCandidates(candidates: Candidate[], context?: ProjectEvidenceContext) {
  return candidates.map((candidate, index) => nameItemFromCandidate(candidate, index, context));
}

function withBackendEvidence(items: NameItem[], context: ProjectEvidenceContext) {
  return items.map((item) => {
    const candidateResults = context.screeningResults?.filter((result) => result.candidateId === item.id) ?? [];
    const backendEvidence = evidenceForCandidate(item.id, context);
    return {
      ...item,
      report: reportFromScreeningResults(item.name, candidateResults),
      ...(backendEvidence ? { backendEvidence } : {})
    };
  });
}

function stateWithProjectSnapshot(current: NameliftState, snapshot: ProjectSnapshot): NameliftState {
  const latestRun = latestScreeningRun(snapshot.screeningRuns);
  const latestReport = latestReportSnapshot(snapshot.reports);
  const names = nameItemsFromCandidates(snapshot.candidates, {
    useBackendEvidence: true,
    screeningResults: snapshot.screeningResults,
    latestRun,
    latestReport
  });
  const snapshotCandidateIds = new Set(snapshot.candidates.map((candidate) => candidate.id));
  const snapshotSavedIds = snapshot.candidates
    .filter((candidate) => candidate.status === "saved" || candidate.status === "shortlisted")
    .map((candidate) => candidate.id);

  return {
    ...current,
    projects: upsertProject(current.projects, projectFromApi(snapshot.project)),
    candidatesByProject: { ...current.candidatesByProject, [snapshot.project.id]: names },
    screeningRunsByProject: { ...current.screeningRunsByProject, [snapshot.project.id]: snapshot.screeningRuns },
    screeningResultsByProject: { ...current.screeningResultsByProject, [snapshot.project.id]: snapshot.screeningResults },
    reportsByProject: { ...current.reportsByProject, [snapshot.project.id]: snapshot.reports },
    saved: Array.from(new Set([...current.saved.filter((id) => !snapshotCandidateIds.has(id)), ...snapshotSavedIds]))
  };
}

function stateWithScreeningResults(
  current: NameliftState,
  projectId: string,
  screeningRun: ScreeningRun,
  results: ScreeningSourceResult[]
): NameliftState {
  const runs = [screeningRun, ...(current.screeningRunsByProject[projectId] ?? []).filter((run) => run.id !== screeningRun.id)];
  const reports = current.reportsByProject[projectId] ?? [];
  const context: ProjectEvidenceContext = {
    useBackendEvidence: true,
    screeningResults: results,
    latestRun: screeningRun,
    latestReport: latestReportSnapshot(reports)
  };
  return {
    ...current,
    candidatesByProject: {
      ...current.candidatesByProject,
      [projectId]: withBackendEvidence(current.candidatesByProject[projectId] ?? [], context)
    },
    screeningRunsByProject: { ...current.screeningRunsByProject, [projectId]: runs },
    screeningResultsByProject: { ...current.screeningResultsByProject, [projectId]: results }
  };
}

function stateWithReportSnapshot(current: NameliftState, projectId: string, report: ReportSnapshot): NameliftState {
  const reports = [report, ...(current.reportsByProject[projectId] ?? []).filter((item) => item.id !== report.id)];
  const latestRun = latestScreeningRun(current.screeningRunsByProject[projectId] ?? []);
  const context: ProjectEvidenceContext = {
    useBackendEvidence: true,
    screeningResults: current.screeningResultsByProject[projectId] ?? [],
    latestRun,
    latestReport: report
  };
  return {
    ...current,
    reportsByProject: { ...current.reportsByProject, [projectId]: reports },
    candidatesByProject: {
      ...current.candidatesByProject,
      [projectId]: withBackendEvidence(current.candidatesByProject[projectId] ?? [], context)
    }
  };
}

async function loadProjectSnapshot(projectId: string) {
  return apiJson<ProjectSnapshot>(`/api/projects/${projectId}`);
}

function candidatesByProjectFromApi(candidates: Candidate[]) {
  return candidates.reduce<Record<string, NameItem[]>>((grouped, candidate, index) => {
    grouped[candidate.projectId] = [
      ...(grouped[candidate.projectId] ?? []),
      nameItemFromCandidate(candidate, index, { useBackendEvidence: true, screeningResults: [] })
    ];
    return grouped;
  }, {});
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  let demoAuthHeader: Record<string, string> = {};
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!clerkClientEnabled && stored && normalizeState(JSON.parse(stored)).authed) {
      demoAuthHeader = { "x-namelift-demo-auth": "true" };
    }
  } catch {
    demoAuthHeader = {};
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...demoAuthHeader,
      ...(init?.headers ?? {})
    }
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data as T;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForJob(jobId: string, label: string) {
  const deadline = Date.now() + 120_000;
  let delay = 750;

  while (Date.now() < deadline) {
    const { job } = await apiJson<{ job: JobRun }>(`/api/jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    if (job.status === "failed") throw new Error(job.errorMessage ?? `${label} failed.`);
    await wait(delay);
    delay = Math.min(2500, delay + 250);
  }

  throw new Error(`${label} is still running. Refresh this project in a moment.`);
}

function isUnlockedProject(projectId: string, state: NameliftState) {
  const demo = DEMO_PROJECTS.find((project) => project.id === projectId);
  if (demo?.status === "unlocked") return true;
  const stored = state.projects.find((project) => project.id === projectId);
  return stored?.status === "unlocked" || state.unlockedProjects.includes(projectId);
}

function titleForProject(projectId: string, state: NameliftState) {
  return state.projects.find((project) => project.id === projectId)?.title ?? DEMO_PROJECTS.find((project) => project.id === projectId)?.title ?? state.title;
}

function briefForProject(projectId: string, state: NameliftState) {
  return state.projects.find((project) => project.id === projectId)?.brief ?? DEMO_PROJECTS.find((project) => project.id === projectId)?.brief ?? state.brief;
}

function styleClass(style: NameStyle) {
  const found = RESULT_STYLES.find((item) => item.key === style);
  return found ? styles[found.className] : styles.pillBrand;
}

function scoreRingStyle(score: number, size: number): CSSVarStyle {
  return {
    "--ring-size": `${size}px`,
    "--ring-score": score,
    "--ring-color": scoreTone(score).color
  };
}

function productRouteForScreen(screen: ProductScreen): RouteKey {
  if (screen === "vibe") return "brief";
  return screen;
}

function ProductApp({
  screen,
  mode,
  projectId,
  nameId,
  success
}: {
  screen: ProductScreen;
  mode?: "login" | "signup";
  projectId?: string;
  nameId?: string;
  success?: boolean;
}) {
  if (clerkClientEnabled) {
    return <ClerkBackedProductApp screen={screen} mode={mode} projectId={projectId} nameId={nameId} success={success} />;
  }

  return (
    <ProductAppInner
      screen={screen}
      mode={mode}
      projectId={projectId}
      nameId={nameId}
      success={success}
      authSession={{
        clerkEnabled: false,
        loaded: true,
        signedIn: false,
        initials: "AV",
        displayName: "Ava Reyes",
        email: "ava@untitled.co"
      }}
    />
  );
}

function ClerkBackedProductApp(props: {
  screen: ProductScreen;
  mode?: "login" | "signup";
  projectId?: string;
  nameId?: string;
  success?: boolean;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const email = user?.primaryEmailAddress?.emailAddress;
  const displayName = user?.fullName || user?.firstName || email || "Account";
  const initials = initialsFor(displayName, email);

  return (
    <ProductAppInner
      {...props}
      authSession={{
        clerkEnabled: true,
        loaded: isLoaded,
        signedIn: Boolean(isSignedIn),
        displayName,
        email,
        initials,
        signOut: () => clerk.signOut({ redirectUrl: "/login" })
      }}
    />
  );
}

function initialsFor(name?: string, email?: string) {
  const source = name && name !== "Account" ? name : email;
  if (!source) return "NM";
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "NM";
}

function ProductAppInner({
  screen,
  mode,
  projectId,
  nameId,
  success,
  authSession
}: {
  screen: ProductScreen;
  mode?: "login" | "signup";
  projectId?: string;
  nameId?: string;
  success?: boolean;
  authSession: AuthSession;
}) {
  const router = useRouter();
  const [state, setState, stateHydrated] = usePersistentState();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const activeScreen: ProductScreen = success ? "success" : screen;
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const onToast = useCallback((message: string, icon: LucideIcon = CheckCircle) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((items) => [...items, { id, message, icon }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 2400);
  }, []);

  const go = useCallback(
    (route: RouteKey, patch: Partial<NameliftState> = {}) => {
      const nextState = normalizeState({ ...stateRef.current, ...patch });
      const nextPath = pathFor(route, nextState);
      const currentPath = `${window.location.pathname}${window.location.search}`;
      stateRef.current = nextState;
      setState(nextState);
      if (currentPath !== nextPath) {
        router.push(nextPath);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [router, setState]
  );
  const goLanding = useCallback(() => {
    router.push("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router]);

  const effectiveProjectId = projectId ?? state.currentProjectId;
  useEffect(() => {
    if (!projectId || projectId === state.currentProjectId) return;
    setState((current) => ({
      ...current,
      currentProjectId: projectId,
      title: titleForProject(projectId, current),
      brief: briefForProject(projectId, current)
    }));
  }, [projectId, setState, state.currentProjectId]);

  useEffect(() => {
    if (!nameId || state.selected === nameId) return;
    setState((current) => ({ ...current, selected: nameId }));
  }, [nameId, setState, state.selected]);

  useEffect(() => {
    if (!authSession.clerkEnabled || !authSession.loaded) return;
    setState((current) => {
      if (current.authed === authSession.signedIn) return current;
      return {
        ...current,
        authed: authSession.signedIn,
        afterAuth: authSession.signedIn ? current.afterAuth : null
      };
    });
  }, [authSession.clerkEnabled, authSession.loaded, authSession.signedIn, setState]);

  useEffect(() => {
    if (!authSession.clerkEnabled || !authSession.loaded || !authSession.signedIn) return;
    if (activeScreen !== "login" && activeScreen !== "signup") return;
    const storedNext = state.afterAuth ?? "dashboard";
    go(storedNext, { authed: true, afterAuth: null });
  }, [activeScreen, authSession.clerkEnabled, authSession.loaded, authSession.signedIn, go, state.afterAuth]);

  const accountLoadKey = authSession.clerkEnabled ? `${authSession.loaded}:${authSession.signedIn}` : String(state.authed);

  useEffect(() => {
    if (authSession.clerkEnabled && !authSession.loaded) return;
    let cancelled = false;
    async function loadAccountState() {
      try {
        const me = await apiJson<{
          actor: { authenticated: boolean; source: string; email?: string };
          freePreviewUsed: boolean;
          projects: Project[];
          savedNames: Candidate[];
          billing?: BillingSummary;
        }>("/api/me");
        const authenticatedBilling = me.actor.authenticated ? await apiJson<{ billing: BillingSummary }>("/api/billing").catch(() => null) : null;
        const billing = authenticatedBilling?.billing ?? me.billing;
        if (cancelled) return;
        setState((current) => {
          const clientAuthSettled = authSession.clerkEnabled && authSession.loaded;
          const nextAuthed = clientAuthSettled ? authSession.signedIn : current.authed || me.actor.authenticated;
          const apiProjects = me.projects.map(projectFromApi);
          const saved = me.savedNames.map((candidate) => candidate.id);
          const savedCandidatesByProject = candidatesByProjectFromApi(me.savedNames);
          const mergedCandidatesByProject = { ...current.candidatesByProject };
          Object.entries(savedCandidatesByProject).forEach(([savedProjectId, savedItems]) => {
            const existing = mergedCandidatesByProject[savedProjectId] ?? [];
            const existingIds = new Set(existing.map((item) => item.id));
            mergedCandidatesByProject[savedProjectId] = [...existing, ...savedItems.filter((item) => !existingIds.has(item.id))];
          });
          const currentProject = apiProjects.find((project) => project.id === current.currentProjectId) ?? apiProjects[0];
          const restoreAnonymousFreeProject = Boolean(!me.actor.authenticated && me.freePreviewUsed && currentProject && !current.activeSprint);
          return {
            ...current,
            authed: nextAuthed,
            freeUsed: me.freePreviewUsed,
            projects: apiProjects,
            saved,
            unlockedProjects: apiProjects.filter((project) => project.status === "unlocked").map((project) => project.id),
            currentProjectId: restoreAnonymousFreeProject && currentProject ? currentProject.id : current.currentProjectId,
            title: restoreAnonymousFreeProject && currentProject ? currentProject.title : current.title,
            brief: restoreAnonymousFreeProject && currentProject ? currentProject.brief : current.brief,
            candidatesByProject: mergedCandidatesByProject,
            billingHistory: billing?.history ?? [],
            billingCursor: billing?.nextCursor ?? null,
            billingTotal: billing?.total ?? 0,
            currentPack: billing?.currentPack ?? null
          };
        });
      } catch {
        // The local demo UI remains usable while the API boots or auth is not configured.
      }
    }
    void loadAccountState();
    return () => {
      cancelled = true;
    };
  }, [accountLoadKey, authSession.clerkEnabled, authSession.loaded, authSession.signedIn, setState]);

  useEffect(() => {
    if (state.authed || state.activeSprint) return;
    if (activeScreen !== "brief" && activeScreen !== "vibe") return;
    if (!state.freeUsed) return;
    const freeProject = state.projects.find((project) => project.id === state.currentProjectId && project.status === "free") ?? state.projects.find((project) => project.status === "free");
    if (!freeProject || freeProject.id === DEFAULT_PROJECT_ID) return;
    go("results", {
      currentProjectId: freeProject.id,
      title: freeProject.title,
      brief: freeProject.brief
    });
  }, [activeScreen, go, state.activeSprint, state.authed, state.currentProjectId, state.freeUsed, state.projects]);

  const shared = { state, setState, go, goLanding, onToast, authSession };
  const requiresAuth = ["dashboard", "saved", "settings", "billing", "reports", "shortlist"].includes(activeScreen);
  const routeAfterAuth = productRouteForScreen(activeScreen);

  let content: ReactNode;
  if (requiresAuth && !state.authed) {
    content = <ScreenAuth {...shared} mode="login" forcedNext={routeAfterAuth} />;
  } else if (activeScreen === "checkout" && !state.authed) {
    content = <ScreenAuth {...shared} mode="login" forcedNext="checkout" pendingPay />;
  } else if (activeScreen === "brief" || activeScreen === "vibe") {
    content = <ScreenBrief {...shared} />;
  } else if (activeScreen === "generating") {
    content = <ScreenGenerating {...shared} stateHydrated={stateHydrated} />;
  } else if (activeScreen === "results") {
    content = <ScreenResults {...shared} projectId={effectiveProjectId} />;
  } else if (activeScreen === "checkout") {
    content = <ScreenCheckout {...shared} />;
  } else if (activeScreen === "success") {
    content = <ScreenSuccess {...shared} />;
  } else if (activeScreen === "dashboard") {
    content = <ScreenDashboard {...shared} />;
  } else if (activeScreen === "saved" || activeScreen === "shortlist") {
    content = <ScreenSaved {...shared} />;
  } else if (activeScreen === "settings") {
    content = <ScreenSettings {...shared} />;
  } else if (activeScreen === "billing") {
    content = <ScreenBilling {...shared} />;
  } else if (activeScreen === "reports") {
    content = <ScreenReports {...shared} />;
  } else if (activeScreen === "report") {
    content = <ScreenNameReport {...shared} projectId={effectiveProjectId} nameId={nameId ?? state.selected ?? "n0"} />;
  } else if (activeScreen === "login" || activeScreen === "signup") {
    content = <ScreenAuth {...shared} mode={mode ?? activeScreen} />;
  } else {
    content = <ScreenBrief {...shared} />;
  }

  return (
    <div className={styles.app}>
      {content}
      <ToastStack toasts={toasts} />
    </div>
  );
}

function Logo({ size = 30, onClick }: { size?: number; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={styles.logoButton} aria-label="Namelift home">
      <span
        className={styles.tile}
        style={{
          width: size,
          height: size,
          background: "var(--brand)",
          borderRadius: size * 0.3,
          boxShadow: "0 6px 14px rgba(31,107,255,.35)"
        }}
      >
        <ArrowUpRight size={size * 0.6} strokeWidth={2.4} />
      </span>
      <span className={styles.logoText} style={{ fontSize: size * 0.72 }}>
        Namelift
      </span>
    </button>
  );
}

function AppTile({ color, icon: Icon, size = 46, radius }: { color: string; icon: LucideIcon; size?: number; radius?: number }) {
  return (
    <span
      className={styles.tile}
      style={{
        width: size,
        height: size,
        background: `var(${color})`,
        borderRadius: radius ?? size * 0.28
      }}
    >
      <Icon size={size * 0.5} strokeWidth={2} />
    </span>
  );
}

function Dropdown({
  trigger,
  children,
  align = "right",
  width = 260
}: {
  trigger: (open: boolean, toggle: () => void) => ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className={styles.dropdown} ref={ref}>
      <div>{trigger(open, () => setOpen((value) => !value))}</div>
      {open ? (
        <div className={cx(styles.menuPanel, align === "right" ? styles.menuRight : styles.menuLeft, styles.popIn)} style={{ width }} onClick={() => setOpen(false)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  sub,
  onClick,
  danger
}: {
  icon?: LucideIcon;
  label: string;
  sub?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className={cx(styles.menuItem, danger && styles.menuItemDanger)}>
      {Icon ? <Icon size={18} strokeWidth={1.8} /> : null}
      <span style={{ flex: 1 }}>{label}</span>
      {sub ? <span style={{ color: "var(--meta)", fontSize: 12, fontWeight: 700 }}>{sub}</span> : null}
    </button>
  );
}

function TopBar({ route, shared }: { route: RouteKey; shared: SharedProps }) {
  const { state, go, goLanding, setState, authSession } = shared;
  const recent = historyProjects(state).slice(0, 3);
  const accountName = authSession.displayName || "Ava Reyes";
  const accountEmail = authSession.email || "ava@untitled.co";
  const accountInitials = authSession.initials || "AV";
  return (
    <header className={styles.topbar}>
      <div className={styles.topInner}>
        <div className={styles.navCluster}>
          <Logo size={28} onClick={() => (state.authed ? go("dashboard") : goLanding())} />
          {state.authed ? (
            <nav className={styles.navTabs} aria-label="Primary">
              <button type="button" onClick={() => go("dashboard")} className={cx(styles.navTab, route === "dashboard" && styles.navTabActive)}>
                Projects
              </button>
              <button type="button" onClick={() => go("saved")} className={cx(styles.navTab, route === "saved" && styles.navTabActive)}>
                Saved
              </button>
            </nav>
          ) : null}
        </div>

        {state.authed ? (
          <div className={styles.topActions}>
            <Dropdown
              width={290}
              trigger={(open, toggle) => (
                <button type="button" onClick={toggle} aria-label="Open history menu" className={cx(styles.iconButton, open && styles.iconButtonActive)}>
                  <Clock3 size={19} strokeWidth={1.8} />
                </button>
              )}
            >
              <div className={styles.menuHeader}>Recent sprints</div>
              {recent.length ? (
                recent.map((project) => (
                  <MenuItem key={project.id} icon={Folder} label={project.title} sub={`${project.count} names`} onClick={() => go("results", { currentProjectId: project.id, title: project.title, brief: project.brief })} />
                ))
              ) : (
                <div style={{ padding: "12px", color: "var(--meta)", fontSize: 13, fontWeight: 700 }}>No recent sprints yet.</div>
              )}
            </Dropdown>

            <button type="button" className={cx(styles.btn, styles.btnSoft)} style={{ padding: "10px 15px", fontSize: 14 }} onClick={() => go("brief")}>
              <Plus size={17} strokeWidth={2.4} /> New
            </button>

            <Dropdown
              width={250}
              trigger={(open, toggle) => (
                <button type="button" onClick={toggle} aria-label="Open account menu" className={cx(styles.iconButton, open && styles.iconButtonActive)} style={{ width: "auto", padding: 5 }}>
                  <span className={styles.tile} style={{ width: 30, height: 30, background: "linear-gradient(135deg,#1f6bff,#0ea5a0)", borderRadius: 9, fontSize: 13, fontWeight: 800 }}>
                    {accountInitials}
                  </span>
                </button>
              )}
            >
              <div style={{ padding: "11px 12px 12px", borderBottom: "1px solid var(--line-2)", marginBottom: 6 }}>
                <div style={{ color: "var(--ink)", fontSize: 14.5, fontWeight: 800 }}>{accountName}</div>
                <div style={{ color: "var(--meta)", fontSize: 12.5, fontWeight: 600 }}>{accountEmail}</div>
              </div>
              <MenuItem icon={User} label="Settings" onClick={() => go("settings")} />
              <MenuItem icon={Lock} label="Billing" onClick={() => go("billing")} />
              <div style={{ height: 1, background: "var(--line-2)", margin: "6px 4px" }} />
              <MenuItem
                icon={LogOut}
                label="Log out"
                danger
                onClick={() => {
                  setState((current) => ({ ...current, authed: false, afterAuth: null }));
                  if (authSession.signOut) {
                    void authSession.signOut();
                  } else {
                    go("login", { authed: false, afterAuth: null });
                  }
                }}
              />
            </Dropdown>
          </div>
        ) : (
          <div className={styles.topActions}>
            <button type="button" className={cx(styles.btn, styles.btnGhost)} style={{ padding: "10px 16px", fontSize: 14 }} onClick={() => go("login")}>
              Log in
            </button>
            <button type="button" className={cx(styles.btn, styles.btnPrimary)} style={{ padding: "10px 16px", boxShadow: "none", fontSize: 14 }} onClick={() => go("signup")}>
              Sign up
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function MinimalTop({ shared }: { shared: SharedProps }) {
  const { state, go, goLanding } = shared;
  const recent = historyProjects(state).slice(0, 2);
  return (
    <div className={styles.briefTop}>
      <Logo size={28} onClick={() => (state.authed ? go("dashboard") : goLanding())} />
      <div className={styles.topActions}>
        {state.authed ? (
          <Dropdown
            width={290}
            trigger={(open, toggle) => (
              <button type="button" onClick={toggle} className={cx(styles.miniButton, open && styles.miniButtonActive)} aria-label="Open history menu">
                <Clock3 size={17} strokeWidth={1.8} /> History
              </button>
            )}
          >
            <div className={styles.menuHeader}>Recent sprints</div>
            {recent.length ? (
              recent.map((project) => (
                <MenuItem key={project.id} icon={Folder} label={project.title} sub={`${project.count} names`} onClick={() => go("results", { currentProjectId: project.id, title: project.title, brief: project.brief })} />
              ))
            ) : (
              <div style={{ padding: "12px", color: "var(--meta)", fontSize: 13, fontWeight: 700 }}>No recent sprints yet.</div>
            )}
          </Dropdown>
        ) : null}
        {state.authed ? (
          <button type="button" className={styles.miniButton} onClick={() => go("dashboard")}>
            <span className={styles.tile} style={{ width: 24, height: 24, background: "linear-gradient(135deg,#1f6bff,#0ea5a0)", borderRadius: 7, fontSize: 11, fontWeight: 800 }}>
              AV
            </span>
            Account
          </button>
        ) : (
          <button type="button" className={styles.miniButton} onClick={() => go("login")}>
            <User size={17} strokeWidth={1.8} /> Log in
          </button>
        )}
      </div>
    </div>
  );
}

function ScreenBrief(shared: SharedProps) {
  const { state, go } = shared;
  const [brief, setBrief] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<BriefStyle[]>(["Modern"]);
  const freeAvailable = !state.freeUsed && !state.authed;
  const canSubmit = brief.trim().length > 4;

  function toggleStyle(style: BriefStyle) {
    setSelectedStyles((current) => (current.includes(style) ? current.filter((item) => item !== style) : [...current, style]));
  }

  function submit() {
    if (!canSubmit) return;
    const projectId = newProjectId();
    const title = truncateTitle(brief);
    const pending = { projectId, title, brief, styles: selectedStyles };
    if (freeAvailable) {
      go("generating", {
        currentProjectId: projectId,
        title,
        brief,
        styles: selectedStyles,
        activeSprint: { ...pending, paidSprint: false },
        payIntent: null,
        pendingBrief: null
      });
    } else if (!state.authed) {
      go("login", {
        currentProjectId: projectId,
        title,
        brief,
        styles: selectedStyles,
        afterAuth: "checkout",
        payIntent: "newSprint",
        pendingBrief: pending
      });
    } else {
      go("checkout", {
        currentProjectId: projectId,
        title,
        brief,
        styles: selectedStyles,
        payIntent: "newSprint",
        pendingBrief: pending
      });
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <MinimalTop shared={shared} />
      <main className={styles.briefStage}>
        <div className={styles.briefWrap}>
          <div className={styles.center} style={{ marginBottom: 22 }}>
            {freeAvailable ? (
              <span className={cx(styles.pill, styles.pillBrand)} style={{ padding: "8px 15px", fontSize: 13 }}>
                <Cpu size={16} strokeWidth={2} /> Your first sprint is free
              </span>
            ) : (
              <span className={cx(styles.pill, styles.pillDark)} style={{ padding: "8px 15px", fontSize: 13 }}>
                <Zap size={15} strokeWidth={2} /> Launch Pack &middot; {launchPrice} per startup
              </span>
            )}
          </div>

          <h1 className={cx(styles.display, styles.center)} style={{ margin: "0 0 16px", fontSize: "clamp(40px, 6vw, 62px)" }}>
            Let&apos;s name something
            <br />
            unforgettable.
          </h1>
          <p className={styles.heroCopy}>Describe what you&apos;re building. We&apos;ll generate names and check every domain, handle, and trademark.</p>

          <section className={cx(styles.card, styles.composer)} aria-labelledby="brief-heading">
            <label id="brief-heading" htmlFor="brief-input" className={styles.eyebrow} style={{ color: "var(--meta)", display: "block", fontSize: 11, marginBottom: 10 }}>
              The brief
            </label>
            <textarea id="brief-input" aria-label="The brief" className={styles.textarea} rows={3} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="We're building a..." />
            {!brief ? (
              <div className={styles.chipRow} style={{ marginTop: 4, marginBottom: 6 }}>
                {exampleBriefs.map((item) => (
                  <button type="button" key={item} className={styles.exampleChip} onClick={() => setBrief(item)}>
                    {item}
                  </button>
                ))}
              </div>
            ) : null}

            <div className={styles.divider} />
            <label className={styles.eyebrow} style={{ color: "var(--meta)", display: "block", fontSize: 11, marginBottom: 12 }}>
              Name style <span style={{ color: "var(--meta)", fontWeight: 600, letterSpacing: 0, textTransform: "none" }}>&middot; pick any</span>
            </label>
            <div className={styles.vibeGrid}>
              {STYLE_OPTIONS.map((item) => {
                const active = selectedStyles.includes(item.key);
                return (
                  <button key={item.key} type="button" onClick={() => toggleStyle(item.key)} className={cx(styles.vibeCard, active && styles.vibeCardActive)} aria-pressed={active}>
                    <AppTile color={item.color} icon={item.icon} size={34} radius={10} />
                    <span>
                      <span style={{ display: "block", color: "var(--ink)", fontSize: 14.5, fontWeight: 800 }}>{item.key}</span>
                      <span style={{ display: "block", color: "var(--body)", fontSize: 11.5, fontWeight: 600, lineHeight: 1.35 }}>{item.desc}</span>
                    </span>
                    {active ? (
                      <span className={styles.checkBadge}>
                        <Check size={11} strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <button type="button" className={cx(styles.btn, styles.btnPrimary)} disabled={!canSubmit} onClick={submit} style={{ width: "100%", marginTop: 20, padding: 17, fontSize: 16.5, opacity: canSubmit ? 1 : 0.5 }}>
              {freeAvailable ? (
                <>
                  Generate {freeNameBatch} free names <ArrowRight size={19} strokeWidth={2.4} />
                </>
              ) : (
                <>
                  Continue - unlock {paidNameBatch} names for {launchPrice} <ArrowRight size={19} strokeWidth={2.4} />
                </>
              )}
            </button>
            <div style={{ marginTop: 12, color: "var(--meta)", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
              {freeAvailable ? "First sprint free - no card required - ~30 seconds" : state.authed ? `${launchPrice} one-time - ${paidNameBatch} names for this startup` : `Sign in, then ${launchPrice} one-time - ${paidNameBatch} names for this startup`}
            </div>
          </section>

          <PaperNote />
        </div>
      </main>
    </div>
  );
}

function PaperNote() {
  return (
    <div className={styles.paperNote} aria-hidden="true">
      <Image src="/images/start-taped-paper-v2.png" alt="" width={1408} height={1117} className={cx(styles.paperImage, styles.paperImageSheet)} priority />
      <Image src="/images/start-sticky-notes-v2.png" alt="" width={1408} height={1117} className={cx(styles.paperImage, styles.paperImageSticky)} priority />
    </div>
  );
}

function ScreenGenerating({ state, go, stateHydrated }: SharedProps & { stateHydrated: boolean }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const taskRef = useRef<{ key: string; promise: Promise<{ route: RouteKey; patch: Partial<NameliftState> }> } | null>(null);
  const routedKeyRef = useRef<string | null>(null);
  const sprint = state.activeSprint;
  const paidSprint = Boolean(sprint?.paidSprint || state.payIntent === "newSprint" || state.payIntent === "unlockCurrent");
  const generationKey = `${sprint?.projectId ?? "no-sprint"}:${paidSprint ? "paid" : "free"}`;

  useEffect(() => {
    if (!stateHydrated) return;
    if (!sprint) {
      if (!taskRef.current && routedKeyRef.current === null) {
        routedKeyRef.current = "missing-sprint";
        go(paidSprint ? "success" : "results");
      }
      return;
    }

    const activeSprint = sprint;
    let cancelled = false;

    async function createAndGenerate() {
      const active = activeSprint;

      let projectId = active.projectId;
      let project = state.projects.find((item) => item.id === projectId);

      if (!project && isLocalProjectId(projectId)) {
        if (!cancelled) setStep(0);
        const created = await apiJson<{ project: Project }>("/api/projects", {
          method: "POST",
          body: JSON.stringify({
            brief: briefForApi(active.title, active.brief, active.styles),
            accessType: paidSprint ? "paid_pack" : "free_preview"
          })
        });
        projectId = created.project.id;
        project = projectFromApi(created.project);
      } else if (!project) {
        project = projectFromSprint({ ...active, projectId, paidSprint }, paidSprint ? "unlocked" : "free");
      }

      if (paidSprint) {
        await apiJson<{ checkoutIntent?: unknown }>("/api/billing/checkout-intents", {
          method: "POST",
          body: JSON.stringify({ projectId })
        }).catch(() => null);
        await apiJson<{ pack: unknown }>("/api/dev/entitlements/grant-pack", {
          method: "POST",
          body: JSON.stringify({ projectId })
        });
      }

      if (!cancelled) setStep(1);
      const generated = await apiJson<{ generationRun?: unknown; candidates?: Candidate[]; job?: JobRun; queued?: boolean }>(`/api/projects/${projectId}/generate`, {
        method: "POST",
        body: JSON.stringify({})
      });
      let generatedCandidates = generated.candidates;
      let generatedSnapshot: ProjectSnapshot | null = null;
      if (!generatedCandidates && generated.job) {
        await waitForJob(generated.job.id, "Name generation");
        generatedSnapshot = await loadProjectSnapshot(projectId);
        generatedCandidates = generatedSnapshot.candidates;
      }
      if (!generatedCandidates) throw new Error("Generation finished without returning names.");
      if (!cancelled) setStep(2);

      const existingEvidence = generatedSnapshot?.screeningResults ?? [];
      if (!existingEvidence.length) {
        const screened = await apiJson<{ screeningRun?: ScreeningRun; results?: ScreeningSourceResult[]; job?: JobRun; queued?: boolean }>(`/api/projects/${projectId}/screen`, {
          method: "POST",
          body: JSON.stringify({})
        });
        if (screened.screeningRun && screened.results) {
          generatedSnapshot = {
            project: {
              id: projectId,
              ownerUserId: "",
              orgId: "",
              name: active.title,
              brief: briefForApi(active.title, active.brief, active.styles),
              accessType: paidSprint ? "paid_pack" : "free_preview",
              paidPackStatus: paidSprint ? "paid" : "none",
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            candidates: generatedCandidates,
            generationRuns: [],
            screeningRuns: [screened.screeningRun],
            screeningResults: screened.results,
            reports: []
          };
        } else if (screened.job) {
          await waitForJob(screened.job.id, "Screening");
          generatedSnapshot = await loadProjectSnapshot(projectId);
        } else {
          throw new Error("Screening finished without returning evidence.");
        }
      }

      const screenedResults = generatedSnapshot?.screeningResults ?? [];
      if (!cancelled && screenedResults.some((result) => result.checkType === "domain")) setStep(3);
      if (!cancelled && screenedResults.some((result) => result.checkType === "social" || result.checkType === "web")) setStep(4);
      if (!cancelled && screenedResults.some((result) => result.checkType === "trademark")) setStep(5);
      if (!cancelled) await wait(180);

      const names = nameItemsFromCandidates(generatedSnapshot?.candidates ?? generatedCandidates, {
        useBackendEvidence: true,
        screeningResults: screenedResults,
        latestRun: latestScreeningRun(generatedSnapshot?.screeningRuns ?? []),
        latestReport: latestReportSnapshot(generatedSnapshot?.reports ?? [])
      });
      const status = paidSprint ? "unlocked" : "free";
      const storedProject: StoredProject = {
        ...(project ?? projectFromSprint(active, status)),
        id: projectId,
        title: active.title,
        brief: active.brief,
        count: paidSprint ? paidNameBatch : freeNameBatch,
        status,
        when: "Just now",
        tileColor: paidSprint ? "--tile-blue" : "--tile-orange",
        iconKey: paidSprint ? "bolt" : "sparkles"
      };

      return {
        route: (paidSprint ? "success" : "results") as RouteKey,
        patch: {
          freeUsed: paidSprint ? state.freeUsed : true,
          currentProjectId: projectId,
          title: active.title,
          brief: active.brief,
          styles: active.styles,
          selected: paidSprint ? state.selected : null,
          unlockedProjects: paidSprint ? Array.from(new Set([...state.unlockedProjects, projectId])) : state.unlockedProjects,
          projects: upsertProject(state.projects, storedProject),
          candidatesByProject: { ...state.candidatesByProject, [projectId]: names },
          screeningRunsByProject: { ...state.screeningRunsByProject, [projectId]: generatedSnapshot?.screeningRuns ?? [] },
          screeningResultsByProject: { ...state.screeningResultsByProject, [projectId]: generatedSnapshot?.screeningResults ?? [] },
          reportsByProject: { ...state.reportsByProject, [projectId]: generatedSnapshot?.reports ?? [] },
          activeSprint: null,
          payIntent: null,
          pendingBrief: null
        } satisfies Partial<NameliftState>
      };
    }

    if (!taskRef.current || taskRef.current.key !== generationKey) {
      taskRef.current = { key: generationKey, promise: createAndGenerate() };
    }
    const apiTask = taskRef.current.promise;
    void apiTask
      .then(({ route, patch }) => {
        if (cancelled || routedKeyRef.current === generationKey) return;
        routedKeyRef.current = generationKey;
        go(route, patch);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Generation failed.");
      });
    return () => {
      cancelled = true;
    };
  }, [
    go,
    generationKey,
    paidSprint,
    sprint,
    stateHydrated,
    state.brief,
    state.candidatesByProject,
    state.freeUsed,
    state.projects,
    state.reportsByProject,
    state.screeningResultsByProject,
    state.screeningRunsByProject,
    state.selected,
    state.styles,
    state.title,
    state.unlockedProjects
  ]);

  const orbiters: Array<{ icon: LucideIcon; x: number; y: number }> = [AtSign, Camera, Globe, Music2, Briefcase, Shield].map((icon, index, arr) => {
    const angle = (index / arr.length) * Math.PI * 2;
    const radius = 96;
    return { icon, x: Math.round(Math.cos(angle) * radius * 1000) / 1000, y: Math.round(Math.sin(angle) * radius * 1000) / 1000 };
  });

  return (
    <main className={styles.orbitWrap}>
      <div style={{ width: "100%", maxWidth: 520, textAlign: "center" }}>
        <div className={styles.orbit} aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span key={index} className={styles.orbitRing} style={{ animationDelay: `${index * 0.8}s` }} />
          ))}
          <div className={styles.orbitSpin}>
            {orbiters.map(({ icon: Icon, x, y }, index) => (
              <span key={index} className={styles.orbitDot} style={{ transform: `translate(-50%,-50%) translate(${x}px, ${y}px)` }}>
                <span className={styles.orbitDotInner}>
                  <Icon size={20} strokeWidth={1.9} />
                </span>
              </span>
            ))}
          </div>
          <span className={cx(styles.tile, styles.orbitCore)}>
            <Sparkles size={36} strokeWidth={1.9} />
          </span>
        </div>

        <h1 className={styles.display} style={{ margin: "0 0 8px", fontSize: 30 }}>
          Naming in progress
        </h1>
        <p style={{ margin: "0 0 28px", color: "var(--body)", fontSize: 15, fontWeight: 600 }}>
          Generating {paidSprint ? paidNameBatch : freeNameBatch} names with full domain, social &amp; trademark checks.
        </p>

        {error ? (
          <div className={styles.card} style={{ marginBottom: 18, padding: 16, color: "var(--bad)", fontSize: 14, fontWeight: 800 }}>
            {error}
          </div>
        ) : null}

        <div className={cx(styles.card, styles.checklist)}>
          {generationSteps.map((item, index) => {
            const done = index < step;
            const active = index === step;
            const Icon = item.icon;
            return (
              <div key={item.label} className={styles.checkStep} style={{ opacity: index <= step ? 1 : 0.4 }}>
                <span
                  className={styles.stepIcon}
                  style={{
                    color: done ? "var(--ok)" : active ? "var(--brand)" : "var(--meta)",
                    background: done ? "var(--ok-tint)" : active ? "var(--brand-tint)" : "var(--paper)"
                  }}
                >
                  {done ? <Check size={15} strokeWidth={3} /> : active ? <span className={styles.spinner} /> : <Icon size={15} strokeWidth={1.9} />}
                </span>
                <span style={{ color: done ? "var(--ink-2)" : active ? "var(--ink)" : "var(--meta)", fontSize: 14, fontWeight: 700 }}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function ScreenResults({ projectId, ...shared }: SharedProps & { projectId: string }) {
  const { state, setState, go, onToast } = shared;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | NameStyle>("All");
  const [sort, setSort] = useState<"score" | "az">("score");
  const [exportOpen, setExportOpen] = useState(false);
  const [projectLoadFailed, setProjectLoadFailed] = useState(false);
  const [screeningStatus, setScreeningStatus] = useState<AsyncStatus>("idle");
  const [screeningError, setScreeningError] = useState<string | null>(null);
  const loadedProjectSnapshots = useRef<Set<string>>(new Set());
  const loadingProjectSnapshots = useRef<Set<string>>(new Set());
  const screeningRequests = useRef<Set<string>>(new Set());
  const unlocked = isUnlockedProject(projectId, state);
  const title = titleForProject(projectId, state);
  const projectNames = state.candidatesByProject[projectId];
  const isDemoProject = DEMO_PROJECTS.some((project) => project.id === projectId);
  const loadingProject = !isDemoProject && !projectNames?.length && !projectLoadFailed;
  const projectScreeningResults = state.screeningResultsByProject[projectId] ?? [];
  const projectReports = state.reportsByProject[projectId] ?? [];
  const latestReport = latestReportSnapshot(projectReports);
  const hasBackendEvidence = projectScreeningResults.length > 0;
  const fallbackNames = useMemo(() => {
    if (projectNames?.length) return projectNames;
    return isDemoProject ? NAMES : EMPTY_NAME_ITEMS;
  }, [isDemoProject, projectNames]);
  const free = fallbackNames.slice(0, freeNameBatch);
  const paid = useMemo(() => (unlocked ? fallbackNames.slice(0, paidNameBatch) : []), [fallbackNames, unlocked]);

  useEffect(() => {
    if (isDemoProject || loadedProjectSnapshots.current.has(projectId) || loadingProjectSnapshots.current.has(projectId)) return;
    let cancelled = false;
    const loadingSnapshots = loadingProjectSnapshots.current;
    loadingSnapshots.add(projectId);
    setProjectLoadFailed(false);
    async function loadProject() {
      try {
        const snapshot = await loadProjectSnapshot(projectId);
        if (cancelled) return;
        setState((current) => stateWithProjectSnapshot(current, snapshot));
        loadedProjectSnapshots.current.add(projectId);
      } catch {
        if (!cancelled) setProjectLoadFailed(true);
      } finally {
        loadingSnapshots.delete(projectId);
      }
    }
    void loadProject();
    return () => {
      cancelled = true;
      loadingSnapshots.delete(projectId);
    };
  }, [isDemoProject, projectId, setState]);

  const runScreening = useCallback(
    async (force = false) => {
      if (isDemoProject || !fallbackNames.length) return;
      if (!force && (hasBackendEvidence || screeningRequests.current.has(projectId))) return;
      screeningRequests.current.add(projectId);
      setScreeningStatus("loading");
      setScreeningError(null);
      try {
        const screened = await apiJson<{ screeningRun?: ScreeningRun; results?: ScreeningSourceResult[]; job?: JobRun; queued?: boolean }>(`/api/projects/${projectId}/screen`, {
          method: "POST",
          body: JSON.stringify({})
        });
        if (screened.screeningRun && screened.results) {
          setState((current) => stateWithScreeningResults(current, projectId, screened.screeningRun!, screened.results!));
        } else if (screened.job) {
          await waitForJob(screened.job.id, "Screening");
          const snapshot = await loadProjectSnapshot(projectId);
          setState((current) => stateWithProjectSnapshot(current, snapshot));
        } else {
          throw new Error("Screening finished without returning evidence.");
        }
        setScreeningStatus("ready");
      } catch (caught) {
        screeningRequests.current.delete(projectId);
        setScreeningStatus("error");
        setScreeningError(caught instanceof Error ? caught.message : "Screening failed.");
      }
    },
    [fallbackNames.length, hasBackendEvidence, isDemoProject, projectId, setState]
  );

  useEffect(() => {
    if (isDemoProject) {
      setScreeningStatus("idle");
      setScreeningError(null);
      return;
    }
    if (hasBackendEvidence) {
      setScreeningStatus("ready");
      setScreeningError(null);
      return;
    }
    if (!loadingProject && fallbackNames.length > 0) void runScreening();
  }, [fallbackNames.length, hasBackendEvidence, isDemoProject, loadingProject, runScreening]);

  const list = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return paid
      .filter((item) => {
        const matchesFilter = filter === "All" || item.style === filter;
        const matchesQuery = !normalized || item.name.toLowerCase().includes(normalized) || item.tagline.toLowerCase().includes(normalized);
        return matchesFilter && matchesQuery;
      })
      .sort((a, b) => (sort === "score" ? b.score - a.score : a.name.localeCompare(b.name)));
  }, [filter, paid, query, sort]);

  const rowActions = makeRowActions(projectId, shared);

  function startUnlock() {
    if (!state.authed) {
      go("login", { afterAuth: "checkout", payIntent: "unlockCurrent", currentProjectId: projectId, title });
    } else {
      go("checkout", { payIntent: "unlockCurrent", currentProjectId: projectId, title });
    }
  }

  function keepStarters() {
    if (!state.authed) go("signup", { afterAuth: "dashboard", currentProjectId: projectId, title });
    else go("dashboard");
  }

  return (
    <div className={styles.pagePaper}>
      <TopBar route="results" shared={shared} />
      <div className={styles.subBand}>
        <div className={cx(styles.container, styles.subBandInner)}>
          <div className={styles.inlineCenter} style={{ minWidth: 0, gap: 13 }}>
            <button type="button" className={styles.backBtn} aria-label={state.authed ? "Back to projects" : "Back to brief"} onClick={() => go(state.authed ? "dashboard" : "brief")}>
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ maxWidth: "min(48vw, 380px)", overflow: "hidden", color: "var(--ink)", fontSize: 16, fontWeight: 800, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
              <div style={{ color: "var(--meta)", fontSize: 13, fontWeight: 700 }}>{unlocked ? `Launch Pack unlocked - ${paidNameBatch} names` : `${freeNameBatch} starter names - free sprint`}</div>
            </div>
          </div>
          {unlocked ? (
            <button type="button" className={cx(styles.btn, styles.btnGhost)} style={{ padding: "11px 16px", fontSize: 14 }} onClick={() => setExportOpen(true)}>
              <Download size={17} strokeWidth={1.9} /> Export report
            </button>
          ) : (
            <StageBar active={2} />
          )}
        </div>
      </div>

      <main className={styles.container} style={{ paddingTop: 30, paddingBottom: 80 }}>
        {loadingProject ? (
          <ResultsLoading />
        ) : unlocked ? (
          <>
            {!isDemoProject ? <EvidenceRunBanner status={screeningStatus} error={screeningError} resultCount={projectScreeningResults.length} onRetry={() => void runScreening(true)} /> : null}
            <PaidResults list={list} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} sort={sort} setSort={setSort} state={state} rowActions={rowActions} />
          </>
        ) : (
          <FreeResults
            free={free}
            state={state}
            rowActions={rowActions}
            startUnlock={startUnlock}
            keepStarters={keepStarters}
            screeningStatus={isDemoProject ? "idle" : screeningStatus}
            screeningError={screeningError}
            onRetryScreening={() => void runScreening(true)}
          />
        )}
      </main>

      {exportOpen ? (
        <ExportModal
          state={state}
          projectId={projectId}
          isDemoProject={isDemoProject}
          latestReport={latestReport}
          title={title}
          setState={setState}
          onToast={onToast}
          onClose={() => setExportOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ResultsLoading() {
  return (
    <div className={styles.card} style={{ padding: 34, textAlign: "center" }}>
      <span className={styles.spinner} style={{ margin: "0 auto 14px" }} />
      <div style={{ color: "var(--ink)", fontSize: 16, fontWeight: 800 }}>Loading stored names...</div>
      <div style={{ marginTop: 6, color: "var(--body)", fontSize: 13.5, fontWeight: 600 }}>Restoring the saved sprint from the backend.</div>
    </div>
  );
}

function EvidenceRunBanner({
  status,
  error,
  resultCount,
  onRetry
}: {
  status: AsyncStatus;
  error: string | null;
  resultCount: number;
  onRetry: () => void;
}) {
  if (status === "idle") return null;
  const Icon = status === "ready" ? CheckCircle : status === "error" ? X : Sparkles;
  return (
    <section
      className={cx(
        styles.evidenceBanner,
        status === "ready" && styles.evidenceBannerReady,
        status === "error" && styles.evidenceBannerError
      )}
      data-testid="evidence-run-status"
      data-status={status}
      aria-live="polite"
    >
      <span className={styles.evidenceBannerIcon}>{status === "loading" ? <span className={styles.spinner} /> : <Icon size={17} strokeWidth={2.2} />}</span>
      <div>
        <strong>{status === "ready" ? "Backend evidence loaded" : status === "error" ? "Evidence checks need a retry" : "Running backend evidence checks"}</strong>
        <span>
          {status === "ready"
            ? `${resultCount} persisted provider results are powering these reports.`
            : status === "error"
              ? (error ?? "The screening request failed.")
              : "Domain, web, social, and trademark provider rows will appear as soon as the run finishes."}
        </span>
      </div>
      {status === "error" ? (
        <button type="button" className={cx(styles.btn, styles.btnSoft)} onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </section>
  );
}

function StageBar({ active }: { active: number }) {
  const stages = ["Describe", "Generate", "Results", "Unlock"];
  return (
    <div className={styles.stageBar} aria-label="Progress">
      {stages.map((stage, index) => {
        const done = index < active;
        const on = index === active;
        return (
          <div className={styles.inlineCenter} key={stage}>
            <div className={styles.stageItem}>
              <span className={cx(styles.stageDot, done && styles.stageDotDone, on && styles.stageDotActive)}>{done ? <Check size={12} strokeWidth={3} /> : index + 1}</span>
              <span style={{ color: on ? "var(--ink)" : done ? "var(--ink-2)" : "var(--meta)", fontSize: 13, fontWeight: 700 }}>{stage}</span>
            </div>
            {index < stages.length - 1 ? <span className={cx(styles.stageLine, index < active && styles.stageLineDone)} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function FreeResults({
  free,
  state,
  rowActions,
  startUnlock,
  keepStarters,
  screeningStatus,
  screeningError,
  onRetryScreening
}: {
  free: NameItem[];
  state: NameliftState;
  rowActions: RowActions;
  startUnlock: () => void;
  keepStarters: () => void;
  screeningStatus: AsyncStatus;
  screeningError: string | null;
  onRetryScreening: () => void;
}) {
  const checkedCopy =
    screeningStatus === "ready"
      ? "Backend evidence loaded"
      : screeningStatus === "error"
        ? "Evidence needs retry"
        : screeningStatus === "loading"
          ? "Evidence checks running"
          : "Domains, socials & trademarks scanned";
  return (
    <>
      <div className={styles.splitHeader} style={{ alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <span className={styles.eyebrow} style={{ color: "var(--brand)" }}>
            Your free sprint
          </span>
          <h1 className={styles.display} style={{ margin: "8px 0 0", fontSize: 34 }}>
            {freeNameBatch} names, fully checked
          </h1>
        </div>
        <span className={cx(styles.pill, styles.pillOk)} style={{ padding: "8px 14px", fontSize: 13 }}>
          <CheckCircle size={16} strokeWidth={2} /> {checkedCopy}
        </span>
      </div>

      {screeningStatus !== "idle" ? (
        <EvidenceRunBanner status={screeningStatus} error={screeningError} resultCount={free.reduce((sum, item) => sum + ((item as EvidenceNameItem).backendEvidence?.providerCount ?? 0), 0)} onRetry={onRetryScreening} />
      ) : null}

      <div className={styles.resultsGrid}>
        {free.map((item, index) => (
          <div key={item.id} className={styles.popIn} style={{ animationDelay: `${index * 90}ms` }}>
            <NameRow item={item} saved={state.saved.includes(item.id)} defaultOpen={index === 0} {...rowActions} />
          </div>
        ))}
      </div>

      <section style={{ position: "relative", marginTop: 30 }}>
        <div className={styles.unlockBanner}>
          <div className={styles.bannerInner}>
            <div style={{ maxWidth: 520 }}>
              <span className={styles.pill} style={{ color: "#fff", background: "rgba(255,255,255,.18)", fontSize: 12, padding: "6px 12px" }}>
                <Zap size={14} strokeWidth={2} /> Launch Pack
              </span>
              <h2 className={styles.display} style={{ margin: "14px 0 8px", color: "#fff", fontSize: 30 }}>
                Unlock 50 more names
              </h2>
              <p style={{ margin: 0, color: "rgba(255,255,255,.88)", fontSize: 15.5, fontWeight: 600, lineHeight: 1.5 }}>
                The full evidence bundle for this startup - every name with domain, handle &amp; trademark checks, plus search, filters, and exportable reports.
              </p>
              <div className={styles.chipRow} style={{ marginTop: 22 }}>
                <button type="button" className={styles.btn} style={{ padding: "15px 24px", color: "var(--brand)", background: "#fff", boxShadow: "0 12px 26px rgba(0,0,0,.18)", fontSize: 16 }} onClick={startUnlock}>
                  {state.authed ? `Unlock ${paidNameBatch} names - ${launchPrice}` : `Sign in to unlock - ${launchPrice}`} <ArrowRight size={18} strokeWidth={2.4} />
                </button>
                <button type="button" className={styles.btn} style={{ padding: "15px 22px", color: "#fff", background: "rgba(255,255,255,.14)", fontSize: 15 }} onClick={keepStarters}>
                  Keep my {freeNameBatch} starters
                </button>
              </div>
              <div style={{ marginTop: 14, color: "rgba(255,255,255,.8)", fontSize: 13, fontWeight: 700 }}>One-time - the price of a coffee - no subscription</div>
            </div>
            <div style={{ display: "grid", gap: 9, minWidth: 200 }}>
              {["50 fresh names", "Full domain + social checks", "Trademark conflict flags", "Markdown report export"].map((item) => (
                <div key={item} className={styles.inlineCenter} style={{ color: "#fff", fontSize: 14.5, fontWeight: 700, gap: 10 }}>
                  <span className={styles.inlineCenter} style={{ justifyContent: "center", width: 22, height: 22, background: "rgba(255,255,255,.22)", borderRadius: 999 }}>
                    <Check size={13} strokeWidth={3} />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <LockedTeaserRows />
      </section>
    </>
  );
}

function LockedTeaserRows() {
  return (
    <div className={styles.lockedTeaser} aria-hidden="true" data-testid="locked-teaser">
      {LOCKED_TEASER_ROWS.map((item, index) => (
        <div
          key={item.name}
          className={cx(styles.card, styles.lockedPreviewRow)}
          data-teaser-kind="visual-decoy"
          style={
            {
              "--teaser-accent": item.accent,
              "--teaser-bg": item.bg,
              "--teaser-delay": `${index * 130}ms`,
              "--teaser-score": item.score
            } as CSSProperties
          }
        >
          <span className={styles.lockedPreviewTile}>
            <Sparkles size={19} strokeWidth={2.4} />
          </span>
          <div className={styles.lockedPreviewBody}>
            <span className={styles.lockedPreviewTitleLine}>
              <span className={styles.lockedPreviewName}>{item.name}</span>
              <span className={styles.lockedPreviewStyle}>{item.style}</span>
            </span>
            <span className={styles.lockedPreviewTagline}>{item.tagline}</span>
          </div>
          <div className={styles.lockedPreviewSignals}>
            {item.checks.map((check) => (
              <span key={check}>{check}</span>
            ))}
          </div>
          <span className={styles.lockedPreviewScore}>{item.score}</span>
          <span className={styles.lockedPreviewAction}>
            <Lock size={16} strokeWidth={2.3} />
          </span>
        </div>
      ))}
    </div>
  );
}

type RowActions = {
  onSave: (id: string) => void;
  onCopy: (item: NameItem) => void;
  onPorkbun: (item: NameItem) => void;
  onSelect: (id: string) => void;
};

function makeRowActions(projectId: string, { state, setState, onToast }: SharedProps): RowActions {
  return {
    onSave(id) {
      const has = state.saved.includes(id);
      setState((current) => ({ ...current, saved: has ? current.saved.filter((item) => item !== id) : [...current.saved, id] }));
      void apiJson<{ candidate: Candidate }>("/api/saved-names", {
        method: has ? "DELETE" : "POST",
        body: JSON.stringify({ projectId, candidateId: id })
      }).catch(() => {
        setState((current) => ({ ...current, saved: has ? [...current.saved, id] : current.saved.filter((item) => item !== id) }));
        onToast("Could not update saved names", X);
      });
      onToast(has ? "Removed from saved" : "Saved to shortlist", Bookmark);
    },
    onCopy(item) {
      try {
        void navigator.clipboard?.writeText(`${item.slug}.com`).catch(() => undefined);
      } catch {
        // Clipboard can be unavailable in automation or restricted browser contexts.
      }
      onToast(`Copied ${item.slug}.com`, Copy);
    },
    onPorkbun(item) {
      window.open(`https://porkbun.com/checkout/search?q=${item.slug}.com`, "_blank", "noopener,noreferrer");
      onToast(`Opening Porkbun for ${item.slug}.com`, ExternalLink);
    },
    onSelect(id) {
      setState((current) => ({ ...current, currentProjectId: projectId, selected: current.selected === id ? null : id }));
    }
  };
}

function PaidResults({
  list,
  query,
  setQuery,
  filter,
  setFilter,
  sort,
  setSort,
  state,
  rowActions
}: {
  list: NameItem[];
  query: string;
  setQuery: (value: string) => void;
  filter: "All" | NameStyle;
  setFilter: (value: "All" | NameStyle) => void;
  sort: "score" | "az";
  setSort: (value: "score" | "az") => void;
  state: NameliftState;
  rowActions: RowActions;
}) {
  const [visibleCount, setVisibleCount] = useState(paidPageSize);
  const visibleList = list.slice(0, visibleCount);
  const hasMore = visibleCount < list.length;

  useEffect(() => {
    setVisibleCount(paidPageSize);
  }, [filter, query, sort]);

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} size={18} strokeWidth={1.9} />
          <input className={styles.searchInput} aria-label="Search paid names" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names..." />
        </div>
        <div className={styles.segmented} aria-label="Filter paid names">
          {(["All", ...RESULT_STYLES.map((item) => item.key)] as Array<"All" | NameStyle>).map((item) => (
            <button key={item} type="button" className={cx(styles.segment, filter === item && styles.segmentActive)} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
        <button type="button" className={cx(styles.btn, styles.btnGhost)} style={{ padding: "12px 15px", fontSize: 13.5 }} onClick={() => setSort(sort === "score" ? "az" : "score")}>
          <SlidersHorizontal size={16} strokeWidth={1.9} /> {sort === "score" ? "Top score" : "A-Z"}
        </button>
      </div>
      <div style={{ marginBottom: 14, color: "var(--meta)", fontSize: 13, fontWeight: 700 }}>
        {list.length > 0 ? `Showing 1-${visibleList.length} of ${list.length} names` : "0 names"}
      </div>
      <div className={styles.resultsGrid}>
        {visibleList.map((item) => (
          <NameRow key={item.id} item={item} saved={state.saved.includes(item.id)} selected={state.selected === item.id} dense {...rowActions} />
        ))}
        {!list.length ? <div style={{ padding: 40, color: "var(--meta)", fontWeight: 700, textAlign: "center" }}>No names match that search.</div> : null}
      </div>
      {hasMore ? (
        <div className={styles.loadMorePanel}>
          <div>
            <strong>{list.length - visibleList.length} names still in this pack</strong>
            <span>Load the next batch when you are ready to keep browsing.</span>
          </div>
          <button type="button" className={cx(styles.btn, styles.btnSoft)} onClick={() => setVisibleCount((current) => Math.min(current + paidPageSize, list.length))}>
            Show {Math.min(paidPageSize, list.length - visibleList.length)} more
          </button>
        </div>
      ) : null}
    </>
  );
}

function NameRow({
  item,
  saved,
  selected,
  locked,
  defaultOpen,
  dense,
  onSave,
  onCopy,
  onPorkbun,
  onSelect
}: {
  item: NameItem;
  saved?: boolean;
  selected?: boolean;
  locked?: boolean;
  defaultOpen?: boolean;
  dense?: boolean;
  onSave?: (id: string) => void;
  onCopy?: (item: NameItem) => void;
  onPorkbun?: (item: NameItem) => void;
  onSelect?: (id: string) => void;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const [copied, setCopied] = useState(false);
  const dom = Object.values(item.report.domains).filter(Boolean).length;
  const soc = Object.values(item.report.socials).filter(Boolean).length;
  const tone = scoreTone(item.score);

  function copyName() {
    onCopy?.(item);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <article className={cx(styles.card, styles.nameRow, selected && styles.nameRowSelected)} style={{ opacity: locked ? 0.96 : 1 }}>
      <div className={styles.nameMain} style={{ padding: dense ? "15px 18px" : undefined }}>
        <AppTile color={item.tileColor} icon={item.icon} size={dense ? 42 : 48} />
        <div className={styles.nameBody}>
          <div className={styles.nameTitleLine}>
            <span className={styles.nameTitle} style={{ fontSize: dense ? 17 : undefined }}>
              {item.name}
            </span>
            <span className={cx(styles.pill, styleClass(item.style))} style={{ padding: "4px 9px", fontSize: 11 }}>
              {item.style}
            </span>
          </div>
          <div className={styles.nameTagline}>{item.tagline}</div>
        </div>

        {!locked ? (
          <div className={styles.inlineCenter} style={{ gap: 14 }}>
            <div className={styles.sigMini}>
              <MiniSignal icon={Globe} ok={dom} total={3} label="domains" />
              <MiniSignal icon={Sparkles} ok={soc} total={5} label="socials" />
            </div>
            <ScoreRing score={item.score} size={46} />
          </div>
        ) : null}

        <div className={styles.rowActions}>
          {locked ? (
            <Lock size={20} strokeWidth={1.8} style={{ color: "var(--meta)" }} />
          ) : (
            <>
              <button type="button" aria-label={`${saved ? "Unsave" : "Save"} ${item.name}`} className={cx(styles.iconAction, saved && styles.iconActionActive)} onClick={() => onSave?.(item.id)}>
                {saved ? <Check size={18} strokeWidth={2.2} /> : <Bookmark size={18} strokeWidth={1.8} />}
              </button>
              <button type="button" aria-label={`${open ? "Hide" : "Show"} report for ${item.name}`} className={cx(styles.iconAction, open && styles.iconActionActive)} onClick={() => setOpen((value) => !value)}>
                <ChevronDown size={18} strokeWidth={2} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .25s" }} />
              </button>
            </>
          )}
        </div>
      </div>

      {open && !locked ? (
        <div className={cx(styles.expanded, styles.fadeIn)}>
          <div className={styles.reportFlex}>
            <div className={styles.reportMain}>
              <ReportGrid report={item.report} name={item.name} evidence={(item as EvidenceNameItem).backendEvidence} />
            </div>
            <div className={styles.reportSide}>
              <div className={styles.scoreBox}>
                <ScoreRing score={item.score} size={52} />
                <div>
                  <div style={{ color: tone.color, fontSize: 14, fontWeight: 800 }}>{tone.label}</div>
                  <div style={{ color: "var(--meta)", fontSize: 12, fontWeight: 600 }}>Confidence</div>
                </div>
              </div>
              <button type="button" className={cx(styles.btn, styles.btnGhost)} style={{ padding: "11px 14px", fontSize: 13.5 }} onClick={copyName}>
                <Copy size={16} strokeWidth={1.9} /> <span>{copied ? "Copied" : "Copy"} {item.slug}.com</span>
              </button>
              <button type="button" className={cx(styles.btn, styles.btnPrimary)} style={{ padding: "11px 14px", boxShadow: "none", fontSize: 13.5 }} onClick={() => onPorkbun?.(item)}>
                <ExternalLink size={16} strokeWidth={1.9} /> Buy on Porkbun
              </button>
              {onSelect ? (
                <button type="button" className={cx(styles.btn, styles.btnSoft)} style={{ padding: "11px 14px", fontSize: 13.5 }} onClick={() => onSelect(item.id)}>
                  {selected ? "Selected" : "Select this name"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MiniSignal({ icon: Icon, ok, total, label }: { icon: LucideIcon; ok: number; total: number; label: string }) {
  return (
    <span className={styles.miniSignal} title={`${ok}/${total} ${label} available`}>
      <Icon size={16} strokeWidth={1.9} style={{ color: ok > 0 ? "var(--ok)" : "var(--meta)" }} />
      {ok}
      <span style={{ color: "var(--meta)", fontWeight: 600 }}>/{total}</span>
    </span>
  );
}

function ScoreRing({ score, size = 46 }: { score: number; size?: number }) {
  return (
    <span className={styles.scoreRing} style={scoreRingStyle(score, size)}>
      <span className={styles.scoreRingValue}>{score}</span>
    </span>
  );
}

function availabilityStatusFromEvidence(relevant: EvidenceSource[] | undefined, fallbackOk: boolean): AvailabilityStatus {
  if (!relevant) return fallbackOk ? "clear" : "review";
  if (!relevant.length) return "not_checked";
  if (relevant.every((source) => source.label === "source_not_checked" || source.label === "source_unavailable")) return "not_checked";
  if (relevant.every((source) => isClearScreeningLabel(source.label))) return "clear";
  return "review";
}

function domainSourcesFor(evidence: BackendEvidence | undefined, clean: string, tld: "com" | "net" | "io") {
  const suffix = `.${tld}`;
  return evidence?.sources.filter((source) => {
    const query = source.query.toLowerCase();
    return source.checkType === "domain" && (query.endsWith(suffix) || query.includes(`${clean}${suffix}`));
  });
}

function socialSourcesFor(evidence: BackendEvidence | undefined, platform: keyof EvidenceReport["socials"]) {
  return evidence?.sources.filter((source) => {
    const haystack = `${source.provider} ${source.source} ${source.query}`.toLowerCase();
    return source.checkType === "social" && haystack.includes(platform);
  });
}

function ReportGrid({ report, name, evidence }: { report: EvidenceReport; name: string; evidence?: BackendEvidence }) {
  const clean = name.toLowerCase().replace(/\s/g, "");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <ReportSection label="Domains">
        <div className={styles.chipRow}>
          {(["com", "net", "io"] as const).map((tld) => (
            <AvailChip key={tld} status={availabilityStatusFromEvidence(domainSourcesFor(evidence, clean, tld), report.domains[tld])} label={`${clean}.${tld}`} icon={Globe} />
          ))}
        </div>
      </ReportSection>
      <ReportSection label="Social handles">
        <div className={styles.chipRow}>
          {socialIcons.map(([key, label, Icon]) => (
            <AvailChip key={key} status={availabilityStatusFromEvidence(socialSourcesFor(evidence, key), report.socials[key])} label={`${label}: @${clean}`} icon={Icon} />
          ))}
        </div>
      </ReportSection>
      <ReportSection label="Trademark">
        <span
          className={styles.inlineCenter}
          style={{
            gap: 8,
            width: "fit-content",
            padding: "8px 12px",
            color: report.trademark === "clear" ? "var(--ok)" : "#b07800",
            background: report.trademark === "clear" ? "var(--ok-tint)" : "var(--warn-tint)",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700
          }}
        >
          <Shield size={16} strokeWidth={1.9} />
          {report.trademark === "clear" ? "No conflicting marks found" : "Possible conflict - review advised"}
        </span>
      </ReportSection>
      {evidence ? (
        <ReportSection label="Provider evidence">
          <ProviderEvidenceList evidence={evidence} />
        </ReportSection>
      ) : null}
    </div>
  );
}

function ProviderEvidenceList({ evidence }: { evidence: BackendEvidence }) {
  if (!evidence.sources.length) {
    return (
      <div className={styles.evidenceEmpty}>
        Backend screening has not finished for this name yet.
      </div>
    );
  }
  return (
    <div className={styles.evidenceSourceList}>
      <div className={styles.evidenceSummary}>
        <span>{evidence.sourceMode ? `${evidence.sourceMode} screening` : "screening"}</span>
        <span>{evidence.providerCount} provider results</span>
        {evidence.reportId ? <span>Report snapshot saved</span> : null}
      </div>
      {evidence.sources.map((source) => (
        <div key={source.id} className={styles.evidenceSourceRow}>
          <div className={styles.evidenceSourceTopline}>
            <span className={styles.evidenceSourceName}>{source.source}</span>
            <span className={cx(styles.evidenceLabel, isClearScreeningLabel(source.label) && styles.evidenceLabelClear)}>
              {SCREENING_LABEL_COPY[source.label] ?? source.label}
            </span>
          </div>
          <div className={styles.evidenceMeta}>
            {source.checkType} &middot; {source.confidence} confidence &middot; {source.freshness}
          </div>
          <div className={styles.evidenceQuery}>{source.query}</div>
          <p>{source.summary}</p>
        </div>
      ))}
    </div>
  );
}

function ReportSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <div className={styles.eyebrow} style={{ marginBottom: 9, color: "var(--meta)", fontSize: 11 }}>
        {label}
      </div>
      {children}
    </section>
  );
}

function availabilityCopy(status: AvailabilityStatus) {
  if (status === "clear") return "Likely open";
  if (status === "not_checked") return "Not checked";
  return "Needs review";
}

function AvailChip({ status, label, icon: Icon }: { status: AvailabilityStatus; label: string; icon: LucideIcon }) {
  const ok = status === "clear";
  const muted = status === "not_checked";
  return (
    <span className={cx(styles.availChip, ok && styles.availOk, muted && styles.availMuted)} title={`${label}: ${availabilityCopy(status)}`}>
      <Icon size={15} strokeWidth={1.9} />
      <span style={{ color: ok ? "var(--ink-2)" : "var(--meta)" }}>{label}</span>
      <strong>{availabilityCopy(status)}</strong>
      {ok ? <Check size={13} strokeWidth={2.6} style={{ color: "var(--ok)" }} /> : <X size={12} strokeWidth={2.4} style={{ color: muted ? "var(--meta)" : "var(--warn)" }} />}
    </span>
  );
}

function useBackendReport({
  projectId,
  enabled,
  latestReport,
  setState
}: {
  projectId?: string;
  enabled: boolean;
  latestReport?: ReportSnapshot;
  setState?: Dispatch<SetStateAction<NameliftState>>;
}) {
  const [report, setReport] = useState<ReportSnapshot | null>(latestReport ?? null);
  const [status, setStatus] = useState<AsyncStatus>(enabled ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);
  const requested = useRef<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (!enabled || !projectId) return;
      const reportId = latestReport?.id ?? report?.id;
      const requestKey = `${projectId}:${reportId ?? "create"}`;
      if (!force && requested.current === requestKey) return;
      requested.current = requestKey;
      setStatus("loading");
      setError(null);
      try {
        const response = reportId
          ? await apiJson<{ report?: ReportSnapshot; job?: JobRun }>(`/api/reports/${reportId}`)
          : await apiJson<{ report?: ReportSnapshot; job?: JobRun; queued?: boolean }>(`/api/projects/${projectId}/reports`, {
              method: "POST",
              body: JSON.stringify({})
            });
        let readyReport = response.report;
        if (!readyReport && response.job) {
          await waitForJob(response.job.id, "Report export");
          const snapshot = await loadProjectSnapshot(projectId);
          readyReport = latestReportSnapshot(snapshot.reports);
          setState?.((current) => stateWithProjectSnapshot(current, snapshot));
        }
        if (!readyReport) throw new Error("Report finished without returning an export.");
        setReport(readyReport);
        setState?.((current) => stateWithReportSnapshot(current, projectId, readyReport));
        setStatus("ready");
      } catch (caught) {
        requested.current = null;
        setStatus("error");
        setError(caught instanceof Error ? caught.message : "Report could not be loaded.");
      }
    },
    [enabled, latestReport?.id, projectId, report?.id, setState]
  );

  useEffect(() => {
    if (latestReport && latestReport.id !== report?.id) setReport(latestReport);
  }, [latestReport, report?.id]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  return { report, status, error, retry: () => void load(true) };
}

function ExportModal({
  title,
  state,
  projectId,
  isDemoProject,
  latestReport,
  setState,
  onToast,
  onClose
}: {
  title: string;
  state: NameliftState;
  projectId?: string;
  isDemoProject?: boolean;
  latestReport?: ReportSnapshot;
  setState?: Dispatch<SetStateAction<NameliftState>>;
  onToast: (message: string, icon?: LucideIcon) => void;
  onClose: () => void;
}) {
  const allNames = Object.values(state.candidatesByProject).flat();
  const savedRows = state.saved.map((id) => allNames.find((item) => item.id === id)).filter(Boolean) as NameItem[];
  const currentRows = state.candidatesByProject[state.currentProjectId] ?? allNames;
  const rows = savedRows.length ? savedRows : currentRows.slice(0, 8);
  const backendReportReady = Boolean(latestReport || (projectId ? (state.screeningResultsByProject[projectId]?.length ?? 0) > 0 : false));
  const backendReport = useBackendReport({
    projectId,
    enabled: Boolean(projectId && !isDemoProject && backendReportReady),
    latestReport,
    setState
  });
  const localMarkdown = buildMarkdown(title, rows);
  const markdown = backendReport.report?.markdown ?? localMarkdown;

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "namelift-report.md";
    anchor.click();
    URL.revokeObjectURL(url);
    onToast("Report downloaded", Download);
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={cx(styles.card, styles.modalCard, styles.popIn)} onClick={(event) => event.stopPropagation()}>
        <div className={styles.splitHeader} style={{ marginBottom: 6 }}>
          <h2 className={styles.display} style={{ margin: 0, fontSize: 22 }}>
            Export report
          </h2>
          <button type="button" aria-label="Close export modal" className={styles.iconAction} onClick={onClose}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <p style={{ margin: "0 0 16px", color: "var(--body)", fontSize: 14, fontWeight: 600 }}>{savedRows.length ? `${savedRows.length} shortlisted names` : "Top names"} with full evidence, ready to share.</p>
        {projectId && !isDemoProject ? (
          backendReportReady ? (
            <BackendReportStatus status={backendReport.status} error={backendReport.error} report={backendReport.report} onRetry={backendReport.retry} />
          ) : (
            <div className={styles.reportStatus}>
              <span className={styles.reportStatusIcon}>
                <Clock3 size={16} strokeWidth={2.2} />
              </span>
              <div>
                <strong>Waiting for evidence checks</strong>
                <span>The local preview is shown until provider screening finishes.</span>
              </div>
            </div>
          )
        ) : null}
        <pre style={{ maxHeight: 240, overflow: "auto", margin: "0 0 18px", padding: 18, color: "#cdd6e6", background: "#0b0e14", borderRadius: 14, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12.5, lineHeight: 1.6 }}>
          {markdown}
        </pre>
        <div className={styles.chipRow}>
          <button type="button" className={cx(styles.btn, styles.btnPrimary)} style={{ flex: 1, padding: 14 }} onClick={download}>
            <Download size={18} strokeWidth={2} /> Download .md
          </button>
          <button type="button" className={cx(styles.btn, styles.btnGhost)} style={{ padding: 14 }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function BackendReportStatus({
  status,
  error,
  report,
  onRetry
}: {
  status: AsyncStatus;
  error: string | null;
  report: ReportSnapshot | null;
  onRetry: () => void;
}) {
  if (status === "idle") return null;
  return (
    <div className={cx(styles.reportStatus, status === "ready" && styles.reportStatusReady, status === "error" && styles.reportStatusError)}>
      <span className={styles.reportStatusIcon}>{status === "loading" ? <span className={styles.spinner} /> : status === "ready" ? <CheckCircle size={16} strokeWidth={2.2} /> : <X size={16} strokeWidth={2.2} />}</span>
      <div>
        <strong>{status === "ready" ? "Backend report ready" : status === "error" ? "Backend report failed" : "Preparing backend report"}</strong>
        <span>
          {status === "ready"
            ? `Snapshot ${report?.id.slice(0, 8) ?? "saved"} is persisted for this project.`
            : status === "error"
              ? (error ?? "Report generation failed.")
              : "Creating or fetching the persisted Markdown snapshot."}
        </span>
      </div>
      {status === "error" ? (
        <button type="button" className={styles.miniButton} onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

function buildMarkdown(title: string, rows: NameItem[]) {
  let text = `# Namelift report\n## ${title || "Naming sprint"}\n\n`;
  rows.forEach((item) => {
    const domains = item.report.domains;
    const socials = item.report.socials;
    text += `### ${item.name} - ${item.score}/100 (${item.style})\n`;
    text += `_${item.tagline}_\n`;
    text += `- Domains: .com ${domains.com ? "yes" : "no"} - .net ${domains.net ? "yes" : "no"} - .io ${domains.io ? "yes" : "no"}\n`;
    text += `- Socials available: ${Object.values(socials).filter(Boolean).length}/5\n`;
    text += `- Trademark: ${item.report.trademark === "clear" ? "clear" : "review advised"}\n\n`;
  });
  text += `_Generated by Namelift - ${new Date().toLocaleDateString()}_\n`;
  return text;
}

function ScreenCheckout(shared: SharedProps) {
  const { state, go } = shared;
  const [paying, setPaying] = useState(false);
  const [card, setCard] = useState("");
  const newSprint = state.payIntent === "newSprint";

  function pay() {
    setPaying(true);
    window.setTimeout(() => {
      if (newSprint) {
        const pending = state.pendingBrief ?? {
          projectId: newProjectId(),
          title: state.title,
          brief: state.brief,
          styles: state.styles
        };
        go("generating", {
          currentProjectId: pending.projectId,
          title: pending.title,
          brief: pending.brief,
          styles: pending.styles,
          activeSprint: { ...pending, paidSprint: true },
          payIntent: "newSprint"
        });
      } else {
        const unlockedProjectId = state.currentProjectId;
        const sprint: ActiveSprint = {
          projectId: unlockedProjectId,
          title: titleForProject(unlockedProjectId, state),
          brief: briefForProject(unlockedProjectId, state),
          styles: state.styles,
          paidSprint: true
        };
        go("generating", {
          activeSprint: sprint,
          payIntent: "unlockCurrent",
          currentProjectId: unlockedProjectId,
          title: sprint.title,
          brief: sprint.brief,
          pendingBrief: null
        });
      }
    }, 1400);
  }

  return (
    <div className={styles.pagePaper}>
      <div className={styles.briefTop}>
        <Logo size={28} onClick={() => go("results")} />
        <button type="button" onClick={() => go(newSprint ? "brief" : "results")} style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--body)", background: "transparent", border: 0, fontSize: 14, fontWeight: 700 }}>
          <ArrowLeft size={17} strokeWidth={2} /> {newSprint ? "Back to brief" : "Back to results"}
        </button>
      </div>

      <main className={cx(styles.container, styles.checkoutGrid)}>
        <section className={styles.card} style={{ padding: 30, borderRadius: "var(--r-card-lg)" }}>
          <span className={styles.eyebrow} style={{ color: "var(--brand)" }}>
            One-time payment
          </span>
          <h1 className={styles.display} style={{ margin: "10px 0 6px", fontSize: 30 }}>
            {newSprint ? "Unlock this startup" : "Unlock your Launch Pack"}
          </h1>
          <p style={{ margin: "0 0 24px", color: "var(--body)", fontSize: 15, fontWeight: 600 }}>
            {newSprint ? `Pay once to generate ${paidNameBatch} names for this startup, with the full evidence bundle.` : `Pay once, get ${paidNameBatch} more names with the full evidence bundle. No subscription.`}
          </p>

          <Field label="Email">
            <input className={styles.input} placeholder="ava@untitled.co" defaultValue="ava@untitled.co" />
          </Field>
          <Field label="Card number">
            <div style={{ position: "relative" }}>
              <input className={styles.input} placeholder="4242 4242 4242 4242" value={card} onChange={(event) => setCard(event.target.value.replace(/[^\d ]/g, "").slice(0, 19))} />
              <div style={{ position: "absolute", right: 14, top: "50%", display: "flex", gap: 5, transform: "translateY(-50%)" }}>
                <span style={{ width: 26, height: 17, background: "linear-gradient(135deg,#1f6bff,#0ea5a0)", borderRadius: 4 }} />
                <span style={{ width: 26, height: 17, background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 4 }} />
              </div>
            </div>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Expiry">
              <input className={styles.input} placeholder="12 / 28" />
            </Field>
            <Field label="CVC">
              <input className={styles.input} placeholder="123" />
            </Field>
          </div>

          <button type="button" className={cx(styles.btn, styles.btnPrimary)} disabled={paying} onClick={pay} style={{ width: "100%", marginTop: 10, padding: 17, fontSize: 16.5 }}>
            {paying ? (
              <>
                <span className={styles.spinner} style={{ borderColor: "rgba(255,255,255,.5)", borderTopColor: "#fff" }} /> Unlocking...
              </>
            ) : (
              <>
                Pay {launchPrice} &amp; unlock <Lock size={17} strokeWidth={2} />
              </>
            )}
          </button>
          <div className={styles.inlineCenter} style={{ justifyContent: "center", gap: 7, marginTop: 14, color: "var(--meta)", fontSize: 13, fontWeight: 700 }}>
            <Lock size={14} strokeWidth={2} /> Demo checkout - Lemon Squeezy in production
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <ReassureChips />
          </div>
        </section>

        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className={styles.card} style={{ padding: 24, borderRadius: "var(--r-card-lg)" }}>
            <div className={styles.inlineCenter} style={{ gap: 12, marginBottom: 16 }}>
              <span className={styles.tile} style={{ width: 46, height: 46, background: "linear-gradient(135deg,#1f6bff,#0ea5a0)", borderRadius: 13 }}>
                <Zap size={24} strokeWidth={1.9} />
              </span>
              <div>
                <div style={{ color: "var(--ink)", fontSize: 16.5, fontWeight: 800 }}>Launch Pack</div>
                <div style={{ color: "var(--meta)", fontSize: 13, fontWeight: 700 }}>One-time - {paidNameBatch} names</div>
              </div>
            </div>
            {[`${paidNameBatch} generated names`, "Domain + social checks", "Trademark flags", "Markdown export"].map((item) => (
              <div key={item} className={styles.splitHeader} style={{ padding: "9px 0", borderBottom: "1px solid var(--line-2)", fontSize: 14 }}>
                <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>{item}</span>
                <span className={styles.inlineCenter} style={{ color: "var(--ok)", gap: 5, fontWeight: 800 }}>
                  <Check size={14} strokeWidth={3} /> Included
                </span>
              </div>
            ))}
            <div className={styles.splitHeader} style={{ marginTop: 18 }}>
              <span style={{ color: "var(--body)", fontWeight: 700 }}>Total due today</span>
              <span className={styles.display} style={{ fontSize: 30 }}>
                {launchPriceLong}
              </span>
            </div>
          </div>
          <button type="button" onClick={() => go(newSprint ? "dashboard" : "results")} style={{ padding: 8, color: "var(--body)", background: "transparent", border: 0, fontSize: 14, fontWeight: 700 }}>
            {newSprint ? "Cancel" : `Keep my ${freeNameBatch} free starters instead`}
          </button>
        </aside>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.eyebrow} style={{ display: "block", marginBottom: 7, color: "var(--meta)", fontSize: 11 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ReassureChips({ items = ["No monthly fees", "No auto-renewals", "Cancel anytime"] }: { items?: string[] }) {
  return (
    <div className={styles.chipRow}>
      {items.map((item) => (
        <span key={item} className={styles.inlineCenter} style={{ gap: 7, padding: "8px 13px", color: "var(--ink-2)", background: "#fff", border: "1px solid var(--line)", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
          <CheckCircle size={15} strokeWidth={2} style={{ color: "var(--ok)" }} /> {item}
        </span>
      ))}
    </div>
  );
}

function ScreenSuccess({ state, go }: SharedProps) {
  const [run, setRun] = useState(false);
  const order = useMemo(() => `LPK-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setRun(true), 120);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={styles.pagePaper}>
      <div className={styles.briefTop}>
        <Logo size={28} onClick={() => go("dashboard")} />
      </div>
      <main style={{ display: "grid", placeItems: "center", padding: "20px 28px 80px" }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 460, textAlign: "center" }}>
          <div style={{ position: "relative", width: 120, height: 120, margin: "10px auto 26px" }}>
            {run ? <Confetti /> : null}
            <span className={styles.tile} style={{ width: 96, height: 96, margin: "12px auto 0", background: "var(--brand)", borderRadius: 28, boxShadow: "var(--sh-brand)", animation: "pop-scale .55s var(--ease)" }}>
              <Check size={50} strokeWidth={2.6} />
            </span>
          </div>
          <h1 className={styles.display} style={{ margin: "0 0 8px", fontSize: 38 }}>
            All set!
          </h1>
          <p style={{ margin: "0 0 26px", color: "var(--body)", fontSize: 16, fontWeight: 600 }}>You now have access to all {paidNameBatch} names for {state.title || "this startup"}.</p>

          <div className={styles.card} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, padding: 18, textAlign: "left" }}>
            <span className={styles.tile} style={{ width: 46, height: 46, background: "linear-gradient(135deg,#1f6bff,#0ea5a0)", borderRadius: 13 }}>
              <Zap size={24} strokeWidth={1.9} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ color: "var(--ink)", fontSize: 15.5, fontWeight: 800 }}>Launch Pack</div>
              <div style={{ color: "var(--meta)", fontSize: 13, fontWeight: 700 }}>{paidNameBatch} names unlocked</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "var(--ink)", fontSize: 16, fontWeight: 800 }}>{launchPriceLong}</div>
              <div style={{ color: "var(--meta)", fontSize: 12, fontWeight: 700 }}>one-time</div>
            </div>
          </div>

          <button type="button" className={cx(styles.btn, styles.btnPrimary)} style={{ width: "100%", marginBottom: 10, padding: 16, fontSize: 16 }} onClick={() => go("results")}>
            View all {paidNameBatch} names <ArrowRight size={18} strokeWidth={2.4} />
          </button>
          <button type="button" className={cx(styles.btn, styles.btnGhost)} style={{ width: "100%", padding: 15, fontSize: 15 }} onClick={() => go("dashboard")}>
            Return to projects
          </button>

          <div className={styles.inlineCenter} style={{ justifyContent: "center", gap: 7, marginTop: 20, color: "var(--meta)", fontSize: 13, fontWeight: 700 }}>
            <CheckCircle size={15} strokeWidth={2} style={{ color: "var(--ok)" }} /> A receipt has been sent to you - Order {order}
          </div>
        </div>
      </main>
    </div>
  );
}

function Confetti() {
  const colors = ["#1f6bff", "#0ea5a0", "#ff5b2e", "#f5a300", "#11a39a", "#f0508a"];
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }} aria-hidden="true">
      {Array.from({ length: 26 }, (_, index) => {
        const angle = (index / 26) * Math.PI * 2 + (index % 3);
        const dist = 90 + (index % 5) * 26;
        const vars: CSSVarStyle = {
          "--cx": `${Math.cos(angle) * dist}px`,
          "--cy": `${Math.sin(angle) * dist - 30}px`,
          "--c": colors[index % colors.length],
          "--d": `${(index % 6) * 60}ms`,
          "--w": index % 2 ? "9px" : "7px",
          "--h": index % 2 ? "9px" : "11px"
        };
        return <span key={index} className={styles.confettiBit} style={vars} />;
      })}
    </div>
  );
}

function ScreenDashboard(shared: SharedProps) {
  const { go, state } = shared;
  const [query, setQuery] = useState("");
  const projects = historyProjects(state).filter((project) => project.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={styles.pagePaper}>
      <TopBar route="dashboard" shared={shared} />
      <main className={styles.container} style={{ paddingTop: 34, paddingBottom: 80 }}>
        <div className={styles.splitHeader} style={{ alignItems: "flex-end", marginBottom: 26 }}>
          <div>
            <span className={styles.eyebrow} style={{ color: "var(--brand)" }}>
              Naming history
            </span>
            <h1 className={styles.display} style={{ margin: "8px 0 0", fontSize: 36 }}>
              Your projects
            </h1>
          </div>
          <button type="button" className={cx(styles.btn, styles.btnPrimary)} onClick={() => go("brief")}>
            <Plus size={18} strokeWidth={2.4} /> Name something new
          </button>
        </div>

        <div className={styles.searchWrap} style={{ maxWidth: 340, marginBottom: 22 }}>
          <Search className={styles.searchIcon} size={18} strokeWidth={1.9} />
          <input className={styles.searchInput} aria-label="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." />
        </div>

        <div className={styles.projectGrid}>
          <button type="button" className={cx(styles.card, styles.projectCard, styles.newProjectCard)} onClick={() => go("brief")}>
            <span className={styles.tile} style={{ width: 44, height: 44, background: "var(--brand)", borderRadius: 12 }}>
              <Plus size={22} strokeWidth={2.4} />
            </span>
            <span style={{ color: "var(--ink)", fontSize: 17, fontWeight: 800 }}>New naming sprint</span>
            <span style={{ color: "var(--body)", fontSize: 13.5, fontWeight: 600 }}>{launchPrice} pack - {paidNameBatch} names for a new startup.</span>
          </button>

          {projects.map((project) => (
            <button key={project.id} type="button" className={cx(styles.card, styles.projectCard)} onClick={() => go("results", { currentProjectId: project.id, title: project.title, brief: project.brief })}>
              <div className={styles.splitHeader} style={{ alignItems: "flex-start" }}>
                <AppTile color={project.tileColor} icon={project.icon} size={42} />
                <span className={cx(styles.pill, project.status === "unlocked" ? styles.pillOk : styles.pillBrand)} style={{ padding: "5px 10px", fontSize: 11 }}>
                  {project.status === "unlocked" ? "Unlocked" : "Free sprint"}
                </span>
              </div>
              <div>
                <div style={{ marginBottom: 4, color: "var(--ink)", fontSize: 18, fontWeight: 800 }}>{project.title}</div>
                <div style={{ color: "var(--body)", fontSize: 13, fontWeight: 600 }}>{project.brief}</div>
              </div>
              <div className={styles.splitHeader} style={{ paddingTop: 12, color: "var(--meta)", borderTop: "1px solid var(--line-2)", fontSize: 13, fontWeight: 700 }}>
                <span>{project.count} names</span>
                <span className={styles.inlineCenter} style={{ gap: 5 }}>
                  <Clock3 size={14} strokeWidth={1.9} /> {project.when}
                </span>
              </div>
            </button>
          ))}
          {!projects.length ? <div className={styles.card} style={{ padding: 30, color: "var(--meta)", fontWeight: 700 }}>No matching projects.</div> : null}
        </div>
      </main>
    </div>
  );
}

function historyProjects(state: NameliftState): Array<DemoProject> {
  const stored: DemoProject[] = state.projects.map((project) => ({ ...project, icon: iconByKey[project.iconKey] }));
  return stored;
}

function billingHistoryItems(state: NameliftState): BillingHistoryItem[] {
  if (state.billingHistory.length > 0) return state.billingHistory;
  const items: BillingHistoryItem[] = state.projects.map((project) => ({
    id: `project-${project.id}`,
    title: project.status === "unlocked" ? "Launch Pack purchased" : "Free preview unlocked",
    description: project.title,
    names: project.count,
    price: project.status === "unlocked" ? launchPriceLong : "Free",
    when: project.when,
    status: project.status
  }));

  const hasFreeEvent = items.some((item) => item.status === "free");
  if (state.freeUsed && !hasFreeEvent) {
    const firstProject = state.projects.at(-1);
    items.push({
      id: "first-free-preview",
      title: "Free preview unlocked",
      description: firstProject?.title ?? "First startup preview",
      names: freeNameBatch,
      price: "Free",
      when: firstProject?.when ?? "First sprint",
      status: "free"
    });
  }

  return items;
}

function ScreenSaved(shared: SharedProps) {
  const { state, setState, go, onToast } = shared;
  const allNames = Object.values(state.candidatesByProject).flat();
  const seedIds = state.saved;
  const rows = seedIds.map((id) => allNames.find((item) => item.id === id)).filter(Boolean) as NameItem[];
  const actions = makeRowActions(state.currentProjectId, shared);

  function unsave(id: string) {
    setState((current) => ({ ...current, saved: current.saved.filter((item) => item !== id) }));
    void apiJson<{ candidate: Candidate }>("/api/saved-names", {
      method: "DELETE",
      body: JSON.stringify({ projectId: state.currentProjectId, candidateId: id })
    }).catch(() => onToast("Could not update saved names", X));
    onToast("Removed from saved", Bookmark);
  }

  return (
    <div className={styles.pagePaper}>
      <TopBar route="saved" shared={shared} />
      <main className={styles.container} style={{ paddingTop: 34, paddingBottom: 80 }}>
        <span className={styles.eyebrow} style={{ color: "var(--brand)" }}>
          Shortlist
        </span>
        <h1 className={styles.display} style={{ margin: "8px 0 22px", fontSize: 36 }}>
          Saved names
        </h1>
        {rows.length ? (
          <div className={styles.resultsGrid}>
            {rows.map((item) => (
              <NameRow key={item.id} item={item} saved onSave={unsave} onCopy={actions.onCopy} onPorkbun={actions.onPorkbun} />
            ))}
          </div>
        ) : (
          <div className={styles.card} style={{ padding: 50, textAlign: "center" }}>
            <div style={{ marginBottom: 14, color: "var(--meta)", fontWeight: 700 }}>No saved names yet.</div>
            <button type="button" className={cx(styles.btn, styles.btnSoft)} onClick={() => go("brief")}>
              Start a naming sprint
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function ScreenAuth({ mode = "login", forcedNext, pendingPay, ...shared }: SharedProps & { mode?: "login" | "signup"; forcedNext?: RouteKey; pendingPay?: boolean }) {
  const { state, go, goLanding, authSession } = shared;
  const signup = mode === "signup";
  const showPayBanner = pendingPay || state.afterAuth === "checkout";
  const next = forcedNext ?? state.afterAuth ?? "dashboard";
  const redirectState = normalizeState({ ...state, authed: true, afterAuth: null });
  const redirectUrl = pathFor(next, redirectState);

  function finishAuth() {
    go(next, { authed: true, afterAuth: null });
  }

  return (
    <div className={styles.authGrid}>
      <div style={{ display: "flex", flexDirection: "column", padding: "28px 40px" }}>
        <Logo size={28} onClick={goLanding} />
        <main style={{ display: "grid", flex: 1, placeItems: "center" }}>
          <div style={{ width: "100%", maxWidth: 360 }}>
            <h1 className={styles.display} style={{ margin: "0 0 8px", fontSize: 32 }}>
              {signup ? "Create your account" : "Welcome back"}
            </h1>
            <p style={{ margin: "0 0 28px", color: "var(--body)", fontSize: 15, fontWeight: 600 }}>{showPayBanner ? "Create an account to unlock your Launch Pack and keep your names." : signup ? "Save sprints and restore your naming history." : "Sign in to restore your naming history."}</p>
            {showPayBanner ? (
              <div className={styles.inlineCenter} style={{ gap: 10, marginBottom: 18, padding: "11px 14px", color: "var(--brand-ink)", background: "var(--brand-tint)", border: "1px solid #d4e2ff", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                <Lock size={17} strokeWidth={1.9} /> Next: {launchPrice} one-time - {paidNameBatch} names for this startup
              </div>
            ) : null}
            {authSession.clerkEnabled ? (
              <div className={styles.clerkAuthShell}>
                {!authSession.loaded ? (
                  <div className={styles.authLoading}>Loading...</div>
                ) : authSession.signedIn ? (
                  <div className={styles.authLoading}>Taking you back...</div>
                ) : signup ? (
                  <SignUp
                    routing="path"
                    path="/signup"
                    signInUrl="/login"
                    forceRedirectUrl={redirectUrl}
                    fallbackRedirectUrl={redirectUrl}
                    appearance={clerkAppearance}
                    oauthFlow="redirect"
                  />
                ) : (
                  <SignIn
                    routing="path"
                    path="/login"
                    signUpUrl="/signup"
                    forceRedirectUrl={redirectUrl}
                    fallbackRedirectUrl={redirectUrl}
                    appearance={clerkAppearance}
                    oauthFlow="redirect"
                  />
                )}
              </div>
            ) : (
              <>
                {signup ? <AuthField label="Name" placeholder="Ava Reyes" /> : null}
                <AuthField label="Email" placeholder="ava@untitled.co" />
                <AuthField label="Password" placeholder="Password" type="password" />
                <button type="button" className={cx(styles.btn, styles.btnPrimary)} style={{ width: "100%", marginTop: 8, padding: 16, fontSize: 16 }} onClick={finishAuth}>
                  {signup ? "Create account" : "Log in"} <ArrowRight size={18} strokeWidth={2.4} />
                </button>
                <div className={styles.inlineCenter} style={{ gap: 12, margin: "16px 0" }}>
                  <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
                  <span style={{ color: "var(--meta)", fontSize: 12.5, fontWeight: 700 }}>or</span>
                  <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
                </div>
                <button type="button" className={cx(styles.btn, styles.btnGhost)} style={{ width: "100%", padding: 14, fontSize: 15, fontWeight: 700 }} onClick={finishAuth}>
                  <span style={{ display: "grid", width: 18, height: 18, placeItems: "center", color: "var(--brand)", background: "var(--paper)", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>G</span>
                  {signup ? "Sign up with Google" : "Continue with Google"}
                </button>
                <div style={{ marginTop: 20, color: "var(--body)", fontSize: 14, fontWeight: 600, textAlign: "center" }}>
                  {signup ? "Already have an account? " : "New to Namelift? "}
                  <button type="button" onClick={() => go(signup ? "login" : "signup", { afterAuth: forcedNext ?? state.afterAuth })} style={{ color: "var(--brand)", background: "transparent", border: 0, fontSize: 14, fontWeight: 800 }}>
                    {signup ? "Log in" : "Create one"}
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
      <aside className={styles.authPanel}>
        <div style={{ position: "relative", zIndex: 2, maxWidth: 380 }}>
          <span className={styles.pill} style={{ color: "#fff", background: "rgba(255,255,255,.18)", fontSize: 12 }}>
            <Cpu size={14} strokeWidth={2} /> AI-Powered Naming
          </span>
          <h2 className={styles.display} style={{ margin: "20px 0 14px", color: "#fff", fontSize: 38, lineHeight: 1.02 }}>
            Name something unforgettable.
          </h2>
          <p style={{ color: "rgba(255,255,255,.86)", fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>
            Three free names with full domain, social, and trademark checks - then {launchPrice} for a full Launch Pack.
          </p>
        </div>
        <div style={{ position: "absolute", right: "6%", bottom: "6%", opacity: 0.96 }}>
          <PaperNote />
        </div>
      </aside>
    </div>
  );
}

const clerkAppearance = {
  variables: {
    colorPrimary: "#1f6bff",
    colorText: "#182033",
    colorTextSecondary: "#687085",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#182033",
    borderRadius: "14px",
    fontFamily: "var(--font-sans)"
  },
  elements: {
    rootBox: {
      width: "100%"
    },
    cardBox: {
      width: "100%",
      boxShadow: "none"
    },
    card: {
      width: "100%",
      padding: "0",
      boxShadow: "none",
      border: "0",
      background: "transparent"
    },
    header: {
      display: "none"
    },
    socialButtonsBlockButton: {
      height: "48px",
      borderRadius: "14px",
      borderColor: "#dfe5ef",
      fontWeight: "700"
    },
    formButtonPrimary: {
      height: "52px",
      borderRadius: "14px",
      background: "#1f6bff",
      fontWeight: "800",
      boxShadow: "0 12px 28px rgba(31, 107, 255, .22)"
    },
    formFieldInput: {
      height: "48px",
      borderRadius: "14px",
      borderColor: "#dfe5ef",
      fontWeight: "650"
    },
    footerActionLink: {
      color: "#1f6bff",
      fontWeight: "800"
    }
  }
} as const;

function AuthField({ label, placeholder, type = "text" }: { label: string; placeholder: string; type?: string }) {
  return (
    <div className={styles.field}>
      <label className={styles.eyebrow} style={{ display: "block", marginBottom: 7, color: "var(--meta)", fontSize: 11 }}>
        {label}
      </label>
      <input className={styles.input} type={type} placeholder={placeholder} />
    </div>
  );
}

function ScreenBilling(shared: SharedProps) {
  const { state, setState, go, onToast } = shared;
  const [historyOpen, setHistoryOpen] = useState(false);
  const history = billingHistoryItems(state);
  const visibleHistory = historyOpen ? history : history.slice(0, 5);
  const hiddenHistoryCount = Math.max(history.length - visibleHistory.length, 0);
  const currentProject = state.projects.find((project) => project.id === state.currentProjectId && project.status === "unlocked") ?? state.projects.find((project) => project.status === "unlocked");
  const hasCurrentPack = Boolean(state.currentPack ?? currentProject);

  async function loadMoreHistory() {
    if (!state.billingCursor) {
      setHistoryOpen(true);
      return;
    }
    try {
      const data = await apiJson<{ billing: BillingSummary }>(`/api/billing/history?limit=5&cursor=${encodeURIComponent(state.billingCursor)}`);
      setState((current) => ({
        ...current,
        billingHistory: [...current.billingHistory, ...data.billing.history],
        billingCursor: data.billing.nextCursor ?? null,
        billingTotal: data.billing.total,
        currentPack: data.billing.currentPack ?? null
      }));
      setHistoryOpen(true);
    } catch {
      onToast("Could not load billing history", Clock3);
    }
  }
  return (
    <div className={styles.pagePaper}>
      <TopBar route="billing" shared={shared} />
      <main className={cx(styles.container, styles.accountGrid)}>
        <AccountNav active="billing" go={go} />
        <div>
          <h1 className={styles.display} style={{ margin: "0 0 6px", fontSize: 34 }}>
            Billing
          </h1>
          <p style={{ margin: "0 0 24px", color: "var(--body)", fontSize: 15, fontWeight: 600 }}>Simple, one-time bundles. No subscriptions.</p>

          <div className={styles.card} style={{ marginBottom: 16, padding: 26, borderRadius: "var(--r-card-lg)" }}>
            <div className={styles.splitHeader} style={{ alignItems: "flex-start", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "var(--meta)", fontSize: 13.5, fontWeight: 700 }}>Current startup</div>
                <div className={styles.display} style={{ margin: "2px 0 4px", fontSize: 40 }}>
                  {hasCurrentPack ? `${paidNameBatch} names` : "No pack yet"}
                </div>
                <div className={styles.inlineCenter} style={{ gap: 9, marginBottom: 16 }}>
                  <span style={{ color: "var(--body)", fontSize: 14, fontWeight: 700 }}>{state.currentPack?.projectName ?? currentProject?.title ?? "One-time Launch Pack"}</span>
                  {hasCurrentPack ? (
                    <span className={cx(styles.pill, styles.pillOk)} style={{ padding: "4px 10px", fontSize: 11 }}>
                      Unlocked
                    </span>
                  ) : (
                    <span className={cx(styles.pill, styles.pillBrand)} style={{ padding: "4px 10px", fontSize: 11 }}>
                      Ready when you are
                    </span>
                  )}
                </div>
                <p style={{ maxWidth: 520, margin: 0, color: "var(--body)", fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>
                  {hasCurrentPack ? `All ${paidNameBatch} generated names are available for this startup. This is access for one startup, not a credit balance.` : `Buy one ${paidNameBatch}-name Launch Pack when you are ready to name a startup. Packs belong to startups, not a credit balance.`}
                </p>
              </div>
              <div style={{ position: "relative", display: "grid", width: 120, placeItems: "center" }}>
                <GiftBox />
                <span style={{ position: "absolute", right: 0, bottom: 0, display: "grid", width: 46, height: 46, placeItems: "center", color: "var(--brand)", background: "#fff", border: "1px solid var(--line)", borderRadius: 999, boxShadow: "var(--sh-card)", fontSize: 15, fontWeight: 800 }}>{hasCurrentPack ? paidNameBatch : launchPrice}</span>
              </div>
            </div>
          </div>

          <div className={styles.card} style={{ marginBottom: 16, padding: 24, borderRadius: "var(--r-card-lg)" }}>
            <div className={styles.splitHeader} style={{ alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div style={{ color: "var(--ink)", fontSize: 16, fontWeight: 800 }}>Pack history</div>
                <div style={{ color: "var(--body)", fontSize: 13.5, fontWeight: 600 }}>Recent free previews and one-time startup packs.</div>
              </div>
              {history.length > 5 || state.billingCursor ? (
                <span className={styles.pill} style={{ padding: "6px 10px", color: "var(--meta)", background: "var(--paper)", fontSize: 11 }}>
                  Showing {visibleHistory.length} of {Math.max(state.billingTotal, history.length)}
                </span>
              ) : null}
            </div>
            {visibleHistory.length ? (
              <div className={styles.billingTimeline}>
                {visibleHistory.map((item) => (
                  <div key={item.id} className={styles.billingTimelineItem}>
                    <span className={cx(styles.tile, styles.billingTimelineIcon, item.status === "free" ? styles.billingTimelineIconFree : styles.billingTimelineIconPaid)}>
                      {item.status === "free" ? <Sparkles size={17} strokeWidth={2} /> : <CheckCircle size={17} strokeWidth={2} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "var(--ink)", fontSize: 14.5, fontWeight: 800 }}>{item.title}</div>
                      <div style={{ color: "var(--body)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                    </div>
                    <div className={styles.billingTimelineMeta}>
                      <span>{item.names} names</span>
                      <strong>{item.price}</strong>
                      <span>{item.when}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyHistory}>
                <Sparkles size={18} strokeWidth={2} />
                <span>No pack history yet. Your free preview and paid startup packs will appear here after you generate them.</span>
              </div>
            )}
            {history.length > 5 || state.billingCursor ? (
              <div className={styles.inlineCenter} style={{ justifyContent: "flex-end", marginTop: 16 }}>
                {historyOpen ? (
                  <button type="button" className={cx(styles.btn, styles.btnGhost)} style={{ padding: "10px 16px", fontSize: 13.5 }} onClick={() => setHistoryOpen(false)}>
                    Show less
                  </button>
                ) : (
                  <button type="button" className={cx(styles.btn, styles.btnGhost)} style={{ padding: "10px 16px", fontSize: 13.5 }} onClick={loadMoreHistory}>
                    {state.billingCursor ? "Load more" : `Load ${hiddenHistoryCount} more`}
                  </button>
                )}
              </div>
            ) : null}
          </div>

          <div className={styles.card} style={{ marginBottom: 16, padding: 24, borderRadius: "var(--r-card-lg)" }}>
            <div className={styles.splitHeader}>
              <div>
                <div style={{ color: "var(--ink)", fontSize: 16, fontWeight: 800 }}>Naming another startup?</div>
                <div style={{ color: "var(--body)", fontSize: 13.5, fontWeight: 600 }}>Start a new sprint and unlock a separate {paidNameBatch}-name Launch Pack for that startup.</div>
              </div>
              <div className={styles.chipRow} style={{ alignItems: "center" }}>
                <div className={styles.inlineCenter} style={{ gap: 10, padding: "11px 16px", color: "var(--ink)", background: "var(--brand-tint)", border: "1.5px solid var(--brand)", borderRadius: 12, fontSize: 14, fontWeight: 800 }}>
                  <CheckCircle size={18} strokeWidth={2} style={{ color: "var(--brand)" }} />
                  Per-startup pack
                  <span style={{ color: "var(--brand-ink)" }}>{launchPriceLong}</span>
                </div>
                <button type="button" className={cx(styles.btn, styles.btnPrimary)} style={{ padding: "14px 22px" }} onClick={() => go("checkout", { payIntent: "newSprint" })}>
                  Start another startup
                </button>
              </div>
            </div>
          </div>

          <div className={styles.card} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", padding: 20, background: "var(--brand-tint-2)", borderColor: "#dbe7ff", borderRadius: "var(--r-card-lg)" }}>
            <div className={styles.inlineCenter} style={{ gap: 13 }}>
              <span className={styles.tile} style={{ width: 40, height: 40, color: "var(--brand)", background: "var(--brand-tint)", borderRadius: 11 }}>
                <Sparkles size={20} strokeWidth={1.9} />
              </span>
              <div>
                <div style={{ color: "var(--ink)", fontSize: 15, fontWeight: 800 }}>No subscriptions. Ever.</div>
                <div style={{ color: "var(--body)", fontSize: 13, fontWeight: 600 }}>Pay once per startup, get all {paidNameBatch} names for that startup.</div>
              </div>
            </div>
            <ReassureChips />
          </div>
        </div>
      </main>
    </div>
  );
}

function GiftBox() {
  return (
    <div className={styles.giftBox} aria-hidden="true">
      <div className={styles.giftBase} />
      <div className={styles.giftRibbon} />
      <div className={styles.giftLid} />
      <div className={styles.giftRibbonTop} />
    </div>
  );
}

function ScreenSettings(shared: SharedProps) {
  const { go, onToast, setState } = shared;
  const [privacyStatus, setPrivacyStatus] = useState<AsyncStatus>("idle");
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const rows = [
    ["Name", "Ava Reyes"],
    ["Email", "ava@untitled.co"],
    ["Password", "************"]
  ];

  async function exportData() {
    setPrivacyStatus("loading");
    setPrivacyError(null);
    try {
      const data = await apiJson<{ export: unknown }>("/api/account/export");
      const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "namelift-account-export.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setPrivacyStatus("ready");
      onToast("Account export downloaded", Download);
    } catch (caught) {
      setPrivacyStatus("error");
      setPrivacyError(caught instanceof Error ? caught.message : "Could not export account data.");
    }
  }

  async function deleteAccount() {
    if (!window.confirm("Delete Namelift account data? This redacts projects, candidates, reports, and private evidence content.")) return;
    setPrivacyStatus("loading");
    setPrivacyError(null);
    try {
      await apiJson<{ ok: true; deletedProjects: number }>("/api/account", { method: "DELETE" });
      setState((current) => ({
        ...current,
        freeUsed: false,
        saved: [],
        selected: null,
        unlockedProjects: [],
        projects: [],
        candidatesByProject: {},
        screeningRunsByProject: {},
        screeningResultsByProject: {},
        reportsByProject: {},
        billingHistory: [],
        billingCursor: null,
        currentPack: null
      }));
      setPrivacyStatus("ready");
      onToast("Account data deleted", Trash2);
      go("brief");
    } catch (caught) {
      setPrivacyStatus("error");
      setPrivacyError(caught instanceof Error ? caught.message : "Could not delete account data.");
    }
  }

  return (
    <div className={styles.pagePaper}>
      <TopBar route="settings" shared={shared} />
      <main className={cx(styles.container, styles.accountGrid)}>
        <AccountNav active="settings" go={go} />
        <div>
          <h1 className={styles.display} style={{ margin: "0 0 24px", fontSize: 34 }}>
            Settings
          </h1>
          <div className={styles.card} style={{ marginBottom: 16, padding: 24, borderRadius: "var(--r-card-lg)" }}>
            <div className={styles.eyebrow} style={{ marginBottom: 4, color: "var(--meta)", fontSize: 11 }}>
              Profile
            </div>
            <div style={{ marginBottom: 18, color: "var(--body)", fontSize: 13.5, fontWeight: 600 }}>Manage your account details and preferences.</div>
            {rows.map(([label, value], index) => (
              <div key={label} className={styles.splitHeader} style={{ padding: "14px 0", borderTop: index ? "1px solid var(--line-2)" : "none" }}>
                <div style={{ display: "flex", gap: 40 }}>
                  <span style={{ width: 80, color: "var(--meta)", fontSize: 14, fontWeight: 700 }}>{label}</span>
                  <span style={{ color: "var(--ink)", fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap" }}>{value}</span>
                </div>
                <button type="button" className={cx(styles.btn, styles.btnGhost)} style={{ padding: "8px 16px", fontSize: 13.5 }} onClick={() => onToast(`${label} editing is a demo action`, Sparkles)}>
                  Edit
                </button>
              </div>
            ))}
          </div>

          <button type="button" className={styles.card} style={{ display: "flex", alignItems: "center", width: "100%", gap: 14, marginBottom: 12, padding: "18px 22px", textAlign: "left", borderRadius: 16 }} onClick={() => onToast("Preferences settings are coming soon", Sparkles)}>
            <span className={styles.tile} style={{ width: 38, height: 38, color: "var(--brand)", background: "var(--paper)", borderRadius: 10 }}>
              <Sparkles size={19} strokeWidth={1.8} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ color: "var(--ink)", fontSize: 15, fontWeight: 800 }}>Preferences</div>
              <div style={{ color: "var(--body)", fontSize: 13, fontWeight: 600 }}>Customize your Namelift experience.</div>
            </div>
            <ChevronRight size={18} strokeWidth={2} style={{ color: "var(--meta)" }} />
          </button>

          <div className={styles.card} style={{ marginBottom: 16, padding: 24, borderRadius: "var(--r-card-lg)" }}>
            <div className={styles.splitHeader} style={{ alignItems: "flex-start", gap: 18 }}>
              <div className={styles.inlineCenter} style={{ alignItems: "flex-start", gap: 14 }}>
              <span className={styles.tile} style={{ width: 38, height: 38, color: "var(--brand)", background: "var(--paper)", borderRadius: 10 }}>
                  <Lock size={19} strokeWidth={1.8} />
              </span>
              <div style={{ flex: 1 }}>
                  <div style={{ color: "var(--ink)", fontSize: 15, fontWeight: 800 }}>Privacy</div>
                  <div style={{ color: "var(--body)", fontSize: 13, fontWeight: 600 }}>Download your account data or redact stored project content.</div>
                </div>
              </div>
              <button type="button" className={cx(styles.btn, styles.btnGhost)} style={{ padding: "10px 15px", fontSize: 13.5 }} onClick={() => void exportData()} disabled={privacyStatus === "loading"}>
                <FileText size={16} strokeWidth={2} /> Export data
              </button>
            </div>
            {privacyError ? <div style={{ marginTop: 12, color: "var(--bad)", fontSize: 13, fontWeight: 800 }}>{privacyError}</div> : null}
          </div>

          <div className={styles.dangerZone}>
            <div style={{ marginBottom: 2, color: "var(--bad)", fontSize: 14, fontWeight: 800 }}>Danger zone</div>
            <div style={{ marginBottom: 14, color: "#b3494d", fontSize: 13, fontWeight: 600 }}>Irreversible and sensitive actions.</div>
            <div className={styles.splitHeader}>
              <div>
                <div style={{ color: "var(--ink)", fontSize: 14, fontWeight: 800 }}>Delete account</div>
                <div style={{ color: "var(--body)", fontSize: 13, fontWeight: 600 }}>Permanently delete your account and all data.</div>
              </div>
              <button type="button" className={styles.btn} style={{ padding: "11px 18px", color: "var(--bad)", background: "#fff", border: "1px solid #f0b3b5", fontSize: 13.5 }} onClick={() => void deleteAccount()} disabled={privacyStatus === "loading"}>
                {privacyStatus === "loading" ? "Working..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AccountNav({ active, go }: { active: "settings" | "billing"; go: (route: RouteKey, patch?: Partial<NameliftState>) => void }) {
  const items: Array<[RouteKey, string, LucideIcon, "settings" | "billing"]> = [
    ["settings", "Profile", User, "settings"],
    ["billing", "Billing", Zap, "billing"]
  ];
  return (
    <nav className={styles.accountNav} aria-label="Account">
      {items.map(([route, label, Icon, key]) => (
        <button key={route} type="button" className={cx(styles.accountNavButton, active === key && styles.accountNavActive)} onClick={() => go(route)}>
          <Icon size={18} strokeWidth={1.8} /> {label}
        </button>
      ))}
    </nav>
  );
}

function ScreenReports(shared: SharedProps) {
  const { state, setState, onToast } = shared;
  const [exportOpen, setExportOpen] = useState(false);
  const title = titleForProject(state.currentProjectId, state);
  const isDemoProject = DEMO_PROJECTS.some((project) => project.id === state.currentProjectId);
  const latestReport = latestReportSnapshot(state.reportsByProject[state.currentProjectId] ?? []);
  return (
    <div className={styles.pagePaper}>
      <TopBar route="reports" shared={shared} />
      <main className={styles.container} style={{ paddingTop: 34, paddingBottom: 80 }}>
        <span className={styles.eyebrow} style={{ color: "var(--brand)" }}>
          Reports
        </span>
        <h1 className={styles.display} style={{ margin: "8px 0 22px", fontSize: 36 }}>
          Evidence reports
        </h1>
        <div className={styles.card} style={{ padding: 24, borderRadius: "var(--r-card-lg)" }}>
          <div className={styles.splitHeader}>
            <div>
              <div style={{ color: "var(--ink)", fontSize: 17, fontWeight: 800 }}>{title}</div>
              <div style={{ color: "var(--body)", fontSize: 13.5, fontWeight: 600 }}>Markdown export for saved names or top recommendations.</div>
            </div>
            <button type="button" className={cx(styles.btn, styles.btnPrimary)} onClick={() => setExportOpen(true)}>
              <Download size={18} strokeWidth={2} /> Export report
            </button>
          </div>
        </div>
      </main>
      {exportOpen ? (
        <ExportModal
          title={title}
          state={state}
          projectId={state.currentProjectId}
          isDemoProject={isDemoProject}
          latestReport={latestReport}
          setState={setState}
          onToast={onToast}
          onClose={() => setExportOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ScreenNameReport({ projectId, nameId, ...shared }: SharedProps & { projectId: string; nameId: string }) {
  const { setState } = shared;
  const [projectStatus, setProjectStatus] = useState<AsyncStatus>("idle");
  const [projectError, setProjectError] = useState<string | null>(null);
  const [screeningStatus, setScreeningStatus] = useState<AsyncStatus>("idle");
  const [screeningError, setScreeningError] = useState<string | null>(null);
  const loaded = useRef<Set<string>>(new Set());
  const screened = useRef<Set<string>>(new Set());
  const isDemoProject = DEMO_PROJECTS.some((project) => project.id === projectId);
  const projectNames = shared.state.candidatesByProject[projectId] ?? [];
  const item = projectNames.find((candidate) => candidate.id === nameId) ?? (isDemoProject ? (NAMES.find((candidate) => candidate.id === nameId) ?? NAMES[0]) : null);
  const rowActions = makeRowActions(projectId, shared);
  const latestReport = latestReportSnapshot(shared.state.reportsByProject[projectId] ?? []);
  const existingScreeningResultCount = shared.state.screeningResultsByProject[projectId]?.length ?? 0;
  const backendReport = useBackendReport({
    projectId,
    enabled: Boolean(!isDemoProject && projectNames.length && (latestReport || existingScreeningResultCount > 0)),
    latestReport,
    setState
  });

  const runScreening = useCallback(
    async (force = false) => {
      if (isDemoProject || !projectNames.length) return;
      if (!force && (existingScreeningResultCount > 0 || screened.current.has(projectId))) return;
      screened.current.add(projectId);
      setScreeningStatus("loading");
      setScreeningError(null);
      try {
        const response = await apiJson<{ screeningRun?: ScreeningRun; results?: ScreeningSourceResult[]; job?: JobRun; queued?: boolean }>(`/api/projects/${projectId}/screen`, {
          method: "POST",
          body: JSON.stringify({})
        });
        if (response.screeningRun && response.results) {
          setState((current) => stateWithScreeningResults(current, projectId, response.screeningRun!, response.results!));
        } else if (response.job) {
          await waitForJob(response.job.id, "Screening");
          const snapshot = await loadProjectSnapshot(projectId);
          setState((current) => stateWithProjectSnapshot(current, snapshot));
        } else {
          throw new Error("Screening finished without returning evidence.");
        }
        setScreeningStatus("ready");
      } catch (caught) {
        screened.current.delete(projectId);
        setScreeningStatus("error");
        setScreeningError(caught instanceof Error ? caught.message : "Screening failed.");
      }
    },
    [existingScreeningResultCount, isDemoProject, projectId, projectNames.length, setState]
  );

  useEffect(() => {
    if (isDemoProject || projectNames.length || loaded.current.has(projectId)) return;
    loaded.current.add(projectId);
    setProjectStatus("loading");
    setProjectError(null);
    let cancelled = false;
    async function load() {
      try {
        const snapshot = await loadProjectSnapshot(projectId);
        if (cancelled) return;
        setState((current) => stateWithProjectSnapshot(current, snapshot));
        setProjectStatus("ready");
      } catch (caught) {
        loaded.current.delete(projectId);
        if (!cancelled) {
          setProjectStatus("error");
          setProjectError(caught instanceof Error ? caught.message : "Project could not be loaded.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isDemoProject, projectId, projectNames.length, setState]);

  useEffect(() => {
    if (isDemoProject) return;
    if (existingScreeningResultCount > 0) {
      setScreeningStatus("ready");
      setScreeningError(null);
      return;
    }
    if (projectNames.length) void runScreening();
  }, [existingScreeningResultCount, isDemoProject, projectNames.length, runScreening]);

  return (
    <div className={styles.pagePaper}>
      <TopBar route="results" shared={shared} />
      <main className={styles.container} style={{ paddingTop: 34, paddingBottom: 80 }}>
        <button type="button" className={styles.miniButton} style={{ marginBottom: 22 }} onClick={() => shared.go("results", { currentProjectId: projectId })}>
          <ArrowLeft size={17} strokeWidth={2} /> Results
        </button>
        <span className={styles.eyebrow} style={{ color: "var(--brand)" }}>
          Name report
        </span>
        <h1 className={styles.display} style={{ margin: "8px 0 22px", fontSize: 36 }}>
          {item?.name ?? "Loading report"}
        </h1>
        {projectStatus === "loading" ? <ResultsLoading /> : null}
        {projectStatus === "error" ? (
          <div className={styles.card} style={{ marginBottom: 18, padding: 18, color: "var(--bad)", fontWeight: 800 }}>
            {projectError}
          </div>
        ) : null}
        {!isDemoProject ? <EvidenceRunBanner status={screeningStatus} error={screeningError} resultCount={(shared.state.screeningResultsByProject[projectId] ?? []).length} onRetry={() => void runScreening(true)} /> : null}
        {item ? <NameRow item={item} saved={shared.state.saved.includes(item.id)} selected={shared.state.selected === item.id} defaultOpen {...rowActions} /> : null}
        {!isDemoProject ? (
          <section className={styles.reportSnapshotPanel}>
            <div className={styles.splitHeader}>
              <div>
                <div style={{ color: "var(--ink)", fontSize: 16, fontWeight: 850 }}>Persisted project report</div>
                <div style={{ color: "var(--body)", fontSize: 13.5, fontWeight: 650 }}>The Markdown report is created through the backend report route.</div>
              </div>
              <BackendReportStatus status={backendReport.status} error={backendReport.error} report={backendReport.report} onRetry={backendReport.retry} />
            </div>
            {backendReport.report?.markdown ? <pre className={styles.reportPreview}>{backendReport.report.markdown}</pre> : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className={styles.toastStack} aria-live="polite">
      {toasts.map((toast) => {
        const Icon = toast.icon;
        return (
          <div key={toast.id} className={cx(styles.toast, styles.popIn)}>
            <Icon size={17} strokeWidth={2.2} style={{ color: "#7fb0ff" }} /> <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DescribeProduct(props: OverlayProps) {
  void props.overlay;
  return <ProductApp screen="brief" />;
}

export function VibeProduct(props: OverlayProps) {
  void props.overlay;
  return <ProductApp screen="vibe" />;
}

export function GeneratingProduct(props: OverlayProps) {
  void props.overlay;
  return <ProductApp screen="generating" />;
}

export function ResultsProduct({ projectId = DEFAULT_PROJECT_ID, overlay }: { projectId?: string; overlay?: boolean }) {
  void overlay;
  return <ProductApp screen="results" projectId={projectId} />;
}

export function CheckoutProduct(props: OverlayProps & { success?: boolean }) {
  void props.overlay;
  return <ProductApp screen="checkout" success={props.success} />;
}

export function DashboardProduct(props: OverlayProps) {
  void props.overlay;
  return <ProductApp screen="dashboard" />;
}

export function DashboardWithUpgrade(props: OverlayProps) {
  void props.overlay;
  return <ProductApp screen="dashboard" />;
}

export function SavedProduct() {
  return <ProductApp screen="saved" />;
}

export function ShortlistProduct({ projectId = DEFAULT_PROJECT_ID, overlay }: { projectId?: string; overlay?: boolean }) {
  void overlay;
  return <ProductApp screen="shortlist" projectId={projectId} />;
}

export function ReportsProduct() {
  return <ProductApp screen="reports" />;
}

export function ReportProduct({ projectId = DEFAULT_PROJECT_ID, nameId = "n0", overlay }: { projectId?: string; nameId?: string; overlay?: boolean }) {
  void overlay;
  return <ProductApp screen="report" projectId={projectId} nameId={nameId} />;
}

export function SettingsProduct() {
  return <ProductApp screen="settings" />;
}

export function LaunchPackProduct() {
  return <ProductApp screen="billing" />;
}

export function AuthProduct({ mode = "signup", overlay }: { mode?: "signup" | "login"; overlay?: boolean }) {
  void overlay;
  return <ProductApp screen={mode} mode={mode} />;
}
