import { NextResponse } from "next/server";
import { errorResponse } from "@/server/api";
import { getCurrentActor } from "@/server/auth";
import { getBillingSummary, hasUsedFreePreview, listProjects, listSavedCandidates } from "@/server/store";

export async function GET() {
  try {
    const actor = await getCurrentActor({ allowAnonymous: true });
    const [freePreviewUsed, projects, savedNames, billing] = await Promise.all([
      hasUsedFreePreview(actor),
      listProjects(actor),
      listSavedCandidates(actor),
      actor.source === "anonymous" ? Promise.resolve(undefined) : getBillingSummary(actor, 5)
    ]);

    return NextResponse.json({
      actor: {
        authenticated: actor.source !== "anonymous",
        source: actor.source,
        email: actor.email
      },
      freePreviewUsed,
      projects,
      savedNames,
      billing
    });
  } catch (error) {
    return errorResponse(error);
  }
}
