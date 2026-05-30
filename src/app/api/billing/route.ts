import { NextResponse } from "next/server";
import { errorResponse } from "@/server/api";
import { getCurrentActor } from "@/server/auth";
import { getBillingSummary } from "@/server/store";

export async function GET() {
  try {
    const actor = await getCurrentActor();
    return NextResponse.json({ billing: await getBillingSummary(actor, 25) });
  } catch (error) {
    return errorResponse(error);
  }
}
