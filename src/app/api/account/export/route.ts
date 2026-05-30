import { NextResponse } from "next/server";
import { errorResponse } from "@/server/api";
import { getCurrentActor } from "@/server/auth";
import { exportAccountData } from "@/server/store";

export async function GET() {
  try {
    const actor = await getCurrentActor();
    const exportData = await exportAccountData(actor);
    return NextResponse.json({ export: exportData });
  } catch (error) {
    return errorResponse(error);
  }
}
