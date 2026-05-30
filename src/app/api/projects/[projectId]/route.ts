import { NextResponse } from "next/server";
import { getCurrentActor } from "@/server/auth";
import { errorResponse } from "@/server/api";
import { deleteProject, getProjectSnapshot } from "@/server/store";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const actor = await getCurrentActor({ allowAnonymous: true });
    const { projectId } = await params;
    const snapshot = await getProjectSnapshot(actor, projectId);
    if (!snapshot) return NextResponse.json({ error: "Project not found", code: "project_not_found" }, { status: 404 });
    return NextResponse.json(snapshot);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const actor = await getCurrentActor();
    const { projectId } = await params;
    const deleted = await deleteProject(actor, projectId);
    if (!deleted) return NextResponse.json({ error: "Project not found", code: "project_not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
