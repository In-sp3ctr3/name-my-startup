import {
  Bolt,
  Check,
  Cpu,
  FileText,
  Globe,
  Shield,
  Sparkles,
  Star,
  Waves,
  type LucideIcon
} from "lucide-react";

export type NameStyle = "Modern" | "Premium" | "Playful" | "Abstract";
export type BriefStyle = "Modern" | "Playful" | "Professional" | "Bold" | "Minimal" | "Invented";

export type EvidenceReport = {
  domains: Record<"com" | "net" | "io", boolean>;
  socials: Record<"x" | "instagram" | "tiktok" | "linkedin" | "youtube", boolean>;
  trademark: "clear" | "review";
};

export type NameItem = {
  id: string;
  name: string;
  tagline: string;
  score: number;
  style: NameStyle;
  slug: string;
  tileColor: string;
  icon: LucideIcon;
  report: EvidenceReport;
};

export type DemoProject = {
  id: string;
  title: string;
  brief: string;
  count: 3 | 50;
  status: "free" | "unlocked";
  when: string;
  tileColor: string;
  icon: LucideIcon;
};

export const STYLE_OPTIONS: Array<{
  key: BriefStyle;
  desc: string;
  color: string;
  icon: LucideIcon;
}> = [
  { key: "Modern", desc: "Clean, forward-thinking", color: "--tile-blue", icon: Cpu },
  { key: "Playful", desc: "Fun, warm, approachable", color: "--tile-orange", icon: Sparkles },
  { key: "Professional", desc: "Trustworthy, established", color: "--tile-purple", icon: Shield },
  { key: "Bold", desc: "Strong, assertive", color: "--tile-pink", icon: Bolt },
  { key: "Minimal", desc: "Simple, elegant", color: "--tile-teal", icon: Waves },
  { key: "Invented", desc: "Unique, distinct, ownable", color: "--tile-amber", icon: Star }
];

export const RESULT_STYLES: Array<{ key: NameStyle; className: "pillModern" | "pillPrem" | "pillWarm" | "pillBrand" }> = [
  { key: "Modern", className: "pillModern" },
  { key: "Premium", className: "pillPrem" },
  { key: "Playful", className: "pillWarm" },
  { key: "Abstract", className: "pillBrand" }
];

const TILE_COLORS = ["--tile-purple", "--tile-teal", "--tile-orange", "--tile-blue", "--tile-pink", "--tile-amber"];
const ICONS = [FileText, Waves, Check, Bolt, Sparkles, Globe, Star, Cpu];

const RAW: Array<[string, string, NameStyle, number]> = [
  ["LumaDesk", "Sleek, memorable, productivity-focused.", "Premium", 96],
  ["Restly", "Clean, calm, and easy to remember.", "Modern", 94],
  ["PulseHaus", "Distinctive, premium, built to scale.", "Premium", 92],
  ["Northwind", "Trustworthy and quietly confident.", "Premium", 90],
  ["Kindle Labs", "Warm, human, approachable.", "Playful", 78],
  ["Vesta", "Short, ownable, founder-friendly.", "Abstract", 88],
  ["Orbita", "Motion and momentum in one word.", "Modern", 86],
  ["Claybox", "Tactile and a little unexpected.", "Playful", 75],
  ["Meridian", "Premium, geographic, dependable.", "Premium", 91],
  ["Flowstate", "Energetic and product-led.", "Modern", 84],
  ["Norabase", "Solid infrastructure feel.", "Abstract", 80],
  ["Tindra", "Scandinavian spark, very ownable.", "Abstract", 89],
  ["Brightly", "Optimistic and consumer-ready.", "Playful", 82],
  ["Apex Loop", "Sharp, ambitious, technical.", "Modern", 83],
  ["Sundial", "Calm, classic, time-aware.", "Premium", 87],
  ["Verve", "One syllable of pure energy.", "Modern", 90],
  ["Maplewise", "Friendly, advisory, grounded.", "Playful", 76],
  ["Quanta", "Scientific precision, tiny footprint.", "Abstract", 85],
  ["Harborly", "Safe-harbor metaphor, soft landing.", "Playful", 79],
  ["Solace", "Reassuring and premium.", "Premium", 88],
  ["Driftless", "Distinct and a little poetic.", "Abstract", 77],
  ["Nimbus Co", "Cloud-native, light, scalable.", "Modern", 81],
  ["Embers", "Warm, bold, hard to forget.", "Playful", 80],
  ["Cobalt", "Strong color-name, instantly visual.", "Modern", 86],
  ["Tessellate", "Pattern-forward, design-led.", "Abstract", 74],
  ["Halcyon", "Premium, calm, aspirational.", "Premium", 89],
  ["Pivota", "Built for change and motion.", "Abstract", 78],
  ["Granite", "Dependable, enterprise-ready.", "Premium", 84],
  ["Wander", "Open, exploratory, consumer.", "Playful", 81],
  ["Lyric", "Expressive and brandable.", "Modern", 87],
  ["Stride", "Forward momentum, fitness-friendly.", "Modern", 83],
  ["Vellum", "Refined, editorial, premium.", "Premium", 85],
  ["Junebug", "Charming, memorable, a little fun.", "Playful", 73],
  ["Axiom", "Logical, foundational, trusted.", "Abstract", 86],
  ["Fernweg", "Distinct, wanderlust, ownable.", "Abstract", 75],
  ["Beacon", "Guiding, reliable, clear.", "Modern", 84]
];

const PREFIXES = ["Vel", "Brix", "Nom", "Sol", "Qua", "Lum", "Nor", "Ark", "Fen", "Tess", "Vyn", "Cyr", "Mira", "Hav", "Lux", "Zeph", "Kai", "Drift"];
const SUFFIXES = ["ora", "ly", "adiq", "ent", "via", "ique", "wave", "mark", "ory", "ade", "ix", "ana", "loop", "stack", "grid", "forge", "peak"];
const FILLER_TAGS = [
  "Ownable and easy to say.",
  "Distinctive across markets.",
  "Short, brandable, available.",
  "Confident and category-fitting.",
  "Memorable with room to grow.",
  "Modern with a premium edge.",
  "Clean phonetics, strong recall.",
  "Unexpected but credible."
];

function prng(seed: number) {
  const x = Math.sin(seed * 99.7) * 10000;
  return x - Math.floor(x);
}

function buildReport(index: number, score: number): EvidenceReport {
  const r = (n: number) => prng(index * 13 + n);
  const bias = (score - 70) / 35;
  const available = (n: number) => r(n) < 0.45 + bias * 0.45;
  return {
    domains: {
      com: available(1),
      net: r(2) < 0.7 || available(2),
      io: available(3)
    },
    socials: {
      x: available(4),
      instagram: available(5),
      tiktok: r(6) < 0.75,
      linkedin: r(7) < 0.85,
      youtube: r(8) < 0.8
    },
    trademark: r(9) < 0.78 ? "clear" : "review"
  };
}

function makeName(index: number) {
  const prefix = PREFIXES[(index * 7) % PREFIXES.length];
  const suffix = SUFFIXES[(index * 5 + 3) % SUFFIXES.length];
  return `${prefix}${suffix}`;
}

const EXTRA: Array<[string, string, NameStyle, number]> = [];
for (let index = 0; EXTRA.length < 53 - RAW.length; index += 1) {
  const name = makeName(index);
  if (RAW.some((row) => row[0] === name) || EXTRA.some((row) => row[0] === name)) continue;
  const score = 70 + ((index * 13) % 26);
  EXTRA.push([name, FILLER_TAGS[index % FILLER_TAGS.length], RESULT_STYLES[index % RESULT_STYLES.length].key, score]);
}

export const NAMES: NameItem[] = [...RAW, ...EXTRA].map(([name, tagline, style, score], index) => ({
  id: `n${index}`,
  name,
  tagline,
  score,
  style,
  slug: name.toLowerCase().replace(/[^a-z0-9]/g, ""),
  tileColor: TILE_COLORS[index % TILE_COLORS.length],
  icon: ICONS[index % ICONS.length],
  report: buildReport(index, score)
}));

export const DEMO_PROJECTS: DemoProject[] = [
  { id: "p1", title: "Budgeting app for freelancers", brief: "A calm budgeting app for freelancers", count: 50, status: "unlocked", when: "2h ago", tileColor: "--tile-blue", icon: Waves },
  { id: "p2", title: "Coffee subscription", brief: "A premium coffee subscription", count: 3, status: "free", when: "Yesterday", tileColor: "--tile-orange", icon: Sparkles },
  { id: "p3", title: "Warehouse robotics", brief: "B2B platform for warehouse robotics", count: 50, status: "unlocked", when: "3 days ago", tileColor: "--tile-teal", icon: Bolt },
  { id: "p4", title: "Meditation timer", brief: "A minimalist meditation timer", count: 50, status: "unlocked", when: "Last week", tileColor: "--tile-purple", icon: Star }
];

export function scoreTone(score: number) {
  if (score >= 88) return { label: "Strong", color: "var(--ok)" };
  if (score >= 80) return { label: "Good", color: "var(--brand)" };
  return { label: "Fair", color: "var(--warn)" };
}
