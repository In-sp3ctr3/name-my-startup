import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { anonSessionSecret } from "@/env";

const COOKIE_NAME = "nms_anon";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function hmac(value: string) {
  if (!anonSessionSecret) throw new Error("ANON_SESSION_SECRET is required for anonymous sessions.");
  return createHmac("sha256", anonSessionSecret).update(value).digest("base64url");
}

function hashSessionId(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function signSessionId(sessionId: string) {
  return `${sessionId}.${hmac(sessionId)}`;
}

function verifyToken(token: string) {
  const [sessionId, signature] = token.split(".");
  if (!sessionId || !signature) return null;
  const expected = hmac(sessionId);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, actualBuffer)) return null;
  return sessionId;
}

export async function getOrCreateAnonymousSessionHash() {
  const jar = await cookies();
  const current = jar.get(COOKIE_NAME)?.value;
  const existingSessionId = current ? verifyToken(current) : null;
  const sessionId = existingSessionId ?? randomBytes(32).toString("base64url");

  if (!existingSessionId) {
    jar.set(COOKIE_NAME, signSessionId(sessionId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR_SECONDS
    });
  }

  return hashSessionId(sessionId);
}

export async function getAnonymousSessionHash() {
  const jar = await cookies();
  const current = jar.get(COOKIE_NAME)?.value;
  const sessionId = current ? verifyToken(current) : null;
  return sessionId ? hashSessionId(sessionId) : undefined;
}
