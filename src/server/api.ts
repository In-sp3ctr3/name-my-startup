import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/server/auth";
import { BusinessRuleError } from "@/server/store";

export function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof AuthError) return jsonError(error.code, error.message, error.status);
  if (error instanceof BusinessRuleError) return jsonError(error.code, error.message, error.status);
  if (error instanceof ZodError) return jsonError("invalid_request", "Invalid request body.", 422);
  throw error;
}
