import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/server/api";
import { getCurrentActor } from "@/server/auth";
import { listSavedCandidates, updateCandidateStatus } from "@/server/store";

const savedNameSchema = z.object({
  projectId: z.string().min(1),
  candidateId: z.string().min(1)
});

export async function GET() {
  try {
    const actor = await getCurrentActor();
    return NextResponse.json({ candidates: await listSavedCandidates(actor) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentActor({ allowAnonymous: true });
    const body = savedNameSchema.parse(await request.json());
    const candidate = await updateCandidateStatus(actor, body.projectId, body.candidateId, "saved");
    if (!candidate) return NextResponse.json({ error: "Candidate not found", code: "candidate_not_found" }, { status: 404 });
    return NextResponse.json({ candidate });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await getCurrentActor({ allowAnonymous: true });
    const body = savedNameSchema.parse(await request.json());
    const candidate = await updateCandidateStatus(actor, body.projectId, body.candidateId, "generated");
    if (!candidate) return NextResponse.json({ error: "Candidate not found", code: "candidate_not_found" }, { status: 404 });
    return NextResponse.json({ candidate });
  } catch (error) {
    return errorResponse(error);
  }
}
