import { NextResponse } from "next/server";
import { z } from "zod";
import { projectBriefSchema } from "@/lib/schemas";
import { getCurrentActor } from "@/server/auth";
import { errorResponse } from "@/server/api";
import { assertRateLimit, createProject, listProjects } from "@/server/store";

const createProjectRequestSchema = z.union([
  projectBriefSchema,
  z.object({
    brief: projectBriefSchema,
    accessType: z.enum(["free_preview", "paid_pack"]).optional()
  })
]);

export async function GET() {
  try {
    const actor = await getCurrentActor({ allowAnonymous: true });
    return NextResponse.json({ projects: await listProjects(actor), actor: { source: actor.source } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createProjectRequestSchema.parse(await request.json());
    const brief = "brief" in body ? body.brief : body;
    const accessType = "brief" in body ? body.accessType : undefined;
    const actor = await getCurrentActor({ allowAnonymous: accessType !== "paid_pack" });
    await assertRateLimit(actor, "projects:create", 10, 60_000);
    const project = await createProject(actor, brief, { accessType });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
