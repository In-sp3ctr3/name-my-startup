import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type MiddlewareEnv = {
  NODE_ENV?: string;
  NEXT_PUBLIC_E2E_DISABLE_CLERK?: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
};

export function shouldEnableClerkMiddleware(runtimeEnv: MiddlewareEnv = process.env) {
  const e2eClerkDisabled = runtimeEnv.NODE_ENV !== "production" && runtimeEnv.NEXT_PUBLIC_E2E_DISABLE_CLERK === "true";
  return !e2eClerkDisabled && Boolean(runtimeEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && runtimeEnv.CLERK_SECRET_KEY);
}

const missingProductionClerkEnv =
  process.env.NODE_ENV === "production"
    ? (["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"] as const).filter((key) => !process.env[key])
    : [];

if (missingProductionClerkEnv.length > 0) {
  throw new Error(`Missing required production Clerk environment variables: ${missingProductionClerkEnv.join(", ")}`);
}

export default shouldEnableClerkMiddleware()
  ? clerkMiddleware()
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|ttf|map)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)"
  ]
};
