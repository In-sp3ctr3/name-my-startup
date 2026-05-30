import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentActor } from "@/server/auth";
import { errorResponse } from "@/server/api";
import { updateCandidateStatus } from "@/server/store";

const updateSchema = z.object({
  status: z.enum(["generated", "saved", "rejected", "shortlisted"]),
  notes: z.string().max(1000).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string; candidateId: string }> }) {
  try {
    const actor = await getCurrentActor({ allowAnonymous: true });
    const { projectId, candidateId } = await params;
    const body: z.infer<typeof updateSchema> = updateSchema.parse(await request.json());
    const candidate = await updateCandidateStatus(actor, projectId, candidateId, body.status, body.notes);
    if (!candidate) return NextResponse.json({ error: "Candidate not found", code: "candidate_not_found" }, { status: 404 });
    return NextResponse.json({ candidate });
  } catch (error) {
    return errorResponse(error);
  }
}
