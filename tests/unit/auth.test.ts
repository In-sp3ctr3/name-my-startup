import { afterEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/types";

const ENV_KEYS = [
  "NODE_ENV",
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_E2E_DISABLE_CLERK",
  "CLERK_SECRET_KEY",
  "ALLOW_DEMO_AUTH",
  "ALLOW_IN_MEMORY_STORE",
  "ENABLE_DEV_PAYMENT_FIXTURE",
  "ANON_SESSION_SECRET"
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as Partial<
  Record<(typeof ENV_KEYS)[number], string>
>;

function resetRuntimeEnv(nodeEnv = "test", overrides: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}) {
  vi.resetModules();
  const runtimeEnv = process.env as Record<string, string | undefined>;
  for (const key of ENV_KEYS) {
    const value = key === "NODE_ENV" ? nodeEnv : undefined;
    if (value === undefined) {
      delete runtimeEnv[key];
    } else {
      runtimeEnv[key] = value;
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete runtimeEnv[key];
    } else {
      runtimeEnv[key] = value;
    }
  }
}

function mockHeaders(headersInit: HeadersInit = {}) {
  vi.doMock("next/headers", () => ({
    headers: async () => new Headers(headersInit)
  }));
}

function mockAnonymousSession(hash = "anon-session-hash-for-tests") {
  vi.doMock("@/server/anonymous-session", () => ({
    getAnonymousSessionHash: vi.fn().mockResolvedValue(hash),
    getOrCreateAnonymousSessionHash: vi.fn().mockResolvedValue(hash)
  }));
}

function mockClerkAuth(authResult: { userId: string | null } | Error) {
  vi.doMock("@clerk/nextjs/server", () => ({
    auth: vi.fn().mockImplementation(async () => {
      if (authResult instanceof Error) throw authResult;
      return authResult;
    }),
    clerkMiddleware: vi.fn(() => vi.fn())
  }));
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("next/headers");
  vi.doUnmock("@/server/anonymous-session");
  vi.doUnmock("@clerk/nextjs/server");

  const runtimeEnv = process.env as Record<string, string | undefined>;
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete runtimeEnv[key];
    } else {
      runtimeEnv[key] = value;
    }
  }
});

describe("auth tenancy", () => {
  it("uses a personal tenant instead of a provider organization", async () => {
    resetRuntimeEnv();
    const { personalTenantId } = await import("@/server/auth");

    expect(personalTenantId("user_123")).toBe("personal:user_123");
  });

  it("keeps project access anchored to owner or internal personal tenant", async () => {
    resetRuntimeEnv();
    const { canAccessProject, personalTenantId } = await import("@/server/auth");
    const actor: Actor = {
      userId: "user_123",
      orgId: personalTenantId("user_123"),
      source: "clerk"
    };

    expect(canAccessProject(actor, personalTenantId("user_123"), "user_123")).toBe(true);
    expect(canAccessProject(actor, "org_from_auth_provider", "other_user")).toBe(false);
  });
});

describe("auth production lockdown", () => {
  it("ignores E2E Clerk disable and dev fixtures in production", async () => {
    resetRuntimeEnv("production", {
      DATABASE_URL: "postgres://example.test/namelift",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_test",
      CLERK_SECRET_KEY: "sk_live_test",
      NEXT_PUBLIC_E2E_DISABLE_CLERK: "true",
      ALLOW_DEMO_AUTH: "true",
      ALLOW_IN_MEMORY_STORE: "true",
      ENABLE_DEV_PAYMENT_FIXTURE: "true",
      ANON_SESSION_SECRET: "production-anon-secret"
    });

    const envModule = await import("@/env");

    expect(envModule.e2eClerkDisabled).toBe(false);
    expect(envModule.hasClerkConfig).toBe(true);
    expect(envModule.demoAuthAllowed).toBe(false);
    expect(envModule.inMemoryStoreAllowed).toBe(false);
    expect(envModule.devPaymentFixtureEnabled).toBe(false);
    expect(envModule.anonSessionSecret).toBe("production-anon-secret");
  });

  it("fails closed when required production auth or persistence env is missing", async () => {
    resetRuntimeEnv("production", {
      NEXT_PUBLIC_E2E_DISABLE_CLERK: "true",
      ALLOW_DEMO_AUTH: "true",
      ALLOW_IN_MEMORY_STORE: "true"
    });

    await expect(import("@/env")).rejects.toThrow(
      "Missing required production environment variables: DATABASE_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, ANON_SESSION_SECRET"
    );
  });

  it("keeps the anonymous-session fallback secret local only", async () => {
    resetRuntimeEnv("development");
    const localEnv = await import("@/env");
    expect(localEnv.anonSessionSecret).toBe("local-anonymous-session-secret");

    resetRuntimeEnv("production", {
      DATABASE_URL: "postgres://example.test/namelift",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_test",
      CLERK_SECRET_KEY: "sk_live_test"
    });

    await expect(import("@/env")).rejects.toThrow("ANON_SESSION_SECRET");
  });

  it("keeps Clerk middleware enabled in production even when E2E disable is set", async () => {
    resetRuntimeEnv();
    const { shouldEnableClerkMiddleware } = await import("@/middleware");

    expect(
      shouldEnableClerkMiddleware({
        NODE_ENV: "production",
        NEXT_PUBLIC_E2E_DISABLE_CLERK: "true",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_test",
        CLERK_SECRET_KEY: "sk_live_test"
      })
    ).toBe(true);

    expect(
      shouldEnableClerkMiddleware({
        NODE_ENV: "test",
        NEXT_PUBLIC_E2E_DISABLE_CLERK: "true",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test",
        CLERK_SECRET_KEY: "sk_test"
      })
    ).toBe(false);
  });

  it("does not allow demo auth when Clerk is configured", async () => {
    resetRuntimeEnv("test", {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test",
      CLERK_SECRET_KEY: "sk_test",
      ALLOW_DEMO_AUTH: "true"
    });
    mockHeaders({ "x-namelift-demo-auth": "true" });
    mockAnonymousSession();
    mockClerkAuth({ userId: null });
    const { getCurrentActor } = await import("@/server/auth");

    await expect(getCurrentActor()).rejects.toMatchObject({
      code: "authentication_required",
      status: 401
    });
  });

  it("returns a controlled JSON 401 for missing required auth", async () => {
    resetRuntimeEnv("test", {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test",
      CLERK_SECRET_KEY: "sk_test"
    });
    mockHeaders();
    mockAnonymousSession();
    mockClerkAuth({ userId: null });
    const { getCurrentActor } = await import("@/server/auth");
    const { errorResponse } = await import("@/server/api");

    let response: Response | undefined;
    try {
      await getCurrentActor();
    } catch (error) {
      response = errorResponse(error);
    }

    expect(response?.status).toBe(401);
    expect(response).toBeDefined();
    await expect(response!.json()).resolves.toEqual({
      error: "Authentication is required.",
      code: "authentication_required"
    });
  });
});
