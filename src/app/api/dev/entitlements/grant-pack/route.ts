import { NextResponse } from "next/server";
import { z } from "zod";
import { devPaymentFixtureEnabled } from "@/env";
import { errorResponse, jsonError } from "@/server/api";
import { getCurrentActor } from "@/server/auth";
import { grantPaidPack } from "@/server/store";

const grantPackSchema = z.object({
  projectId: z.string().min(1)
});

export async function POST(request: Request) {
  if (!devPaymentFixtureEnabled || process.env.NODE_ENV === "production") {
    return jsonError("not_found", "Not found.", 404);
  }

  try {
    const actor = await getCurrentActor();
    const body = grantPackSchema.parse(await request.json());
    const pack = await grantPaidPack(actor, body.projectId, { provider: "placeholder", externalPaymentId: `dev_${crypto.randomUUID()}` });
    if (!pack) return NextResponse.json({ error: "Project not found", code: "project_not_found" }, { status: 404 });
    return NextResponse.json({ pack });
  } catch (error) {
    return errorResponse(error);
  }
}
