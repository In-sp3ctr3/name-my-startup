import { demoAuthAllowed, hasClerkConfig } from "@/env";
import type { Actor } from "@/lib/types";
import { getAnonymousSessionHash, getOrCreateAnonymousSessionHash } from "@/server/anonymous-session";
import { headers } from "next/headers";

export function personalTenantId(userId: string) {
  return `personal:${userId}`;
}

const DEMO_ACTOR: Actor = {
  userId: "demo-user",
  orgId: personalTenantId("demo-user"),
  email: "founder@example.com",
  source: "demo"
};

export class AuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function authenticationRequired(): never {
  throw new AuthError("authentication_required", "Authentication is required.");
}

type CurrentActorOptions = {
  allowAnonymous?: boolean;
};

function anonymousActor(anonSessionHash: string): Actor {
  const anonId = `anon:${anonSessionHash.slice(0, 24)}`;
  return {
    userId: anonId,
    orgId: anonId,
    source: "anonymous",
    anonSessionHash
  };
}

export async function getCurrentActor(options: CurrentActorOptions = {}): Promise<Actor> {
  let anonSessionHash: string | undefined;
  try {
    anonSessionHash = options.allowAnonymous ? await getOrCreateAnonymousSessionHash() : await getAnonymousSessionHash();
  } catch {
    throw new AuthError("anonymous_session_unavailable", "Anonymous session is unavailable.", 503);
  }
  const requestHeaders = await headers().catch(() => null);
  const demoAuthRequested = requestHeaders?.get("x-namelift-demo-auth") === "true";

  if (!hasClerkConfig) {
    if (options.allowAnonymous && !demoAuthRequested) return anonymousActor(anonSessionHash!);
    if (!demoAuthAllowed) authenticationRequired();
    return { ...DEMO_ACTOR, anonSessionHash };
  }

  try {
    const clerk = await import("@clerk/nextjs/server");
    const authResult = await clerk.auth();
    if (!authResult.userId) {
      if (options.allowAnonymous) return anonymousActor(anonSessionHash!);
      if (!demoAuthAllowed) authenticationRequired();
      return { ...DEMO_ACTOR, anonSessionHash };
    }

    return {
      userId: authResult.userId,
      orgId: personalTenantId(authResult.userId),
      source: "clerk",
      anonSessionHash
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    if (options.allowAnonymous) return anonymousActor(anonSessionHash!);
    if (!demoAuthAllowed) authenticationRequired();
    return { ...DEMO_ACTOR, anonSessionHash };
  }
}

export async function requireCurrentActor() {
  try {
    const actor = await getCurrentActor();
    if (actor.source === "anonymous") throw new AuthError("authentication_required", "Authentication is required.");
    return actor;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("authentication_required", "Authentication is required.");
  }
}

export function canAccessProject(actor: Actor, projectOrgId: string, ownerUserId: string) {
  return actor.orgId === projectOrgId || actor.userId === ownerUserId;
}
