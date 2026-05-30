import { NextResponse } from "next/server";
import { errorResponse } from "@/server/api";
import { getCurrentActor } from "@/server/auth";
import { deleteAccountData } from "@/server/store";

export async function DELETE() {
  try {
    const actor = await getCurrentActor();
    const result = await deleteAccountData(actor);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
