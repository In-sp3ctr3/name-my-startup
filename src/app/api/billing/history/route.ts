import { NextResponse } from "next/server";
import { errorResponse } from "@/server/api";
import { getCurrentActor } from "@/server/auth";
import { getBillingSummary } from "@/server/store";

export async function GET(request: Request) {
  try {
    const actor = await getCurrentActor();
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "5");
    const cursor = url.searchParams.get("cursor") ?? undefined;
    return NextResponse.json({ billing: await getBillingSummary(actor, limit, cursor) });
  } catch (error) {
    return errorResponse(error);
  }
}
