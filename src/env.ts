import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/login"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/signup"),
  NEXT_PUBLIC_E2E_DISABLE_CLERK: z.enum(["true", "false"]).optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_NAMING_MODEL: z.string().default("gpt-5.4-mini"),
  OPENAI_NAMING_FREE_MODEL: z.string().default("gpt-5.4-nano"),
  OPENAI_NAMING_PAID_MODEL: z.string().default("gpt-5.4-mini"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_NAMING_MODEL: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  AI_PRIMARY_PROVIDER: z.enum(["openai", "openrouter", "fixture"]).optional(),
  AI_FALLBACK_PROVIDER: z.enum(["openai", "openrouter", "fixture", "none"]).default("fixture"),
  AI_MAX_GENERATION_COST_CENTS: z.coerce.number().int().positive().default(15),
  AI_DAILY_BUDGET_CENTS: z.coerce.number().int().positive().default(100),
  JOB_EXECUTION_MODE: z.enum(["inline", "detached"]).default("inline"),
  JOB_RUNNER_SECRET: z.string().optional(),
  JOB_DRAIN_BATCH_SIZE: z.coerce.number().int().positive().max(10).default(3),
  JOB_STALE_AFTER_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  JOB_BACKGROUND_TRIGGER_URL: z.string().url().optional(),
  ALLOW_DEMO_AUTH: z.enum(["true", "false"]).optional(),
  ALLOW_IN_MEMORY_STORE: z.enum(["true", "false"]).optional(),
  ENABLE_DEV_PAYMENT_FIXTURE: z.enum(["true", "false"]).optional(),
  ANON_SESSION_SECRET: z.string().optional(),
  ENABLE_REAL_PROVIDERS: z.enum(["true", "false"]).default("false"),
  BRAVE_SEARCH_API_KEY: z.string().optional()
});

const REQUIRED_PRODUCTION_ENV = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "ANON_SESSION_SECRET"
] as const;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  NEXT_PUBLIC_E2E_DISABLE_CLERK: process.env.NEXT_PUBLIC_E2E_DISABLE_CLERK,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_NAMING_MODEL: process.env.OPENAI_NAMING_MODEL,
  OPENAI_NAMING_FREE_MODEL: process.env.OPENAI_NAMING_FREE_MODEL,
  OPENAI_NAMING_PAID_MODEL: process.env.OPENAI_NAMING_PAID_MODEL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_NAMING_MODEL: process.env.OPENROUTER_NAMING_MODEL,
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  AI_PRIMARY_PROVIDER: process.env.AI_PRIMARY_PROVIDER,
  AI_FALLBACK_PROVIDER: process.env.AI_FALLBACK_PROVIDER,
  AI_MAX_GENERATION_COST_CENTS: process.env.AI_MAX_GENERATION_COST_CENTS,
  AI_DAILY_BUDGET_CENTS: process.env.AI_DAILY_BUDGET_CENTS,
  JOB_EXECUTION_MODE: process.env.JOB_EXECUTION_MODE,
  JOB_RUNNER_SECRET: process.env.JOB_RUNNER_SECRET,
  JOB_DRAIN_BATCH_SIZE: process.env.JOB_DRAIN_BATCH_SIZE,
  JOB_STALE_AFTER_MS: process.env.JOB_STALE_AFTER_MS,
  JOB_BACKGROUND_TRIGGER_URL: process.env.JOB_BACKGROUND_TRIGGER_URL,
  ALLOW_DEMO_AUTH: process.env.ALLOW_DEMO_AUTH,
  ALLOW_IN_MEMORY_STORE: process.env.ALLOW_IN_MEMORY_STORE,
  ENABLE_DEV_PAYMENT_FIXTURE: process.env.ENABLE_DEV_PAYMENT_FIXTURE,
  ANON_SESSION_SECRET: process.env.ANON_SESSION_SECRET,
  ENABLE_REAL_PROVIDERS: process.env.ENABLE_REAL_PROVIDERS,
  BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY
});

const missingProductionEnv = isProduction() ? REQUIRED_PRODUCTION_ENV.filter((key) => !env[key]) : [];

const missingDetachedJobEnv = isProduction() && env.JOB_EXECUTION_MODE === "detached" && !env.JOB_RUNNER_SECRET ? ["JOB_RUNNER_SECRET"] : [];
const missingRequiredEnv = [...missingProductionEnv, ...missingDetachedJobEnv];

if (missingRequiredEnv.length > 0) {
  throw new Error(`Missing required production environment variables: ${missingRequiredEnv.join(", ")}`);
}

export const e2eClerkDisabled = !isProduction() && env.NEXT_PUBLIC_E2E_DISABLE_CLERK === "true";
export const hasClerkConfig = !e2eClerkDisabled && Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY);
export const hasDatabaseConfig = Boolean(env.DATABASE_URL);
export const demoAuthAllowed = !isProduction() && !hasClerkConfig && env.ALLOW_DEMO_AUTH !== "false";
export const inMemoryStoreAllowed = !isProduction() && (env.ALLOW_IN_MEMORY_STORE === "true" || !hasDatabaseConfig);
export const devPaymentFixtureEnabled = !isProduction() && (env.ENABLE_DEV_PAYMENT_FIXTURE === "true" || demoAuthAllowed);
export const anonSessionSecret = env.ANON_SESSION_SECRET ?? (isProduction() ? undefined : "local-anonymous-session-secret");
export const realProvidersEnabled = env.ENABLE_REAL_PROVIDERS === "true";
export const detachedJobsEnabled = env.JOB_EXECUTION_MODE === "detached";
export const primaryAiProvider =
  env.AI_PRIMARY_PROVIDER ?? (env.OPENAI_API_KEY ? "openai" : env.OPENROUTER_API_KEY ? "openrouter" : "fixture");
