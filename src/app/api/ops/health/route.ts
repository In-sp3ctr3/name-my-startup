import { NextResponse } from "next/server";
import { errorResponse } from "@/server/api";
import { getCurrentActor } from "@/server/auth";
import { getAiUsageSummary, getJobHealth, getProviderHealth } from "@/server/store";

export async function GET() {
  try {
    const actor = await getCurrentActor();
    const [aiUsage, jobs, providers] = await Promise.all([getAiUsageSummary(actor), getJobHealth(actor), getProviderHealth()]);
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      aiUsage,
      jobs,
      providers
    });
  } catch (error) {
    return errorResponse(error);
  }
}
