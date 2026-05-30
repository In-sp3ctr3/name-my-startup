import { NextResponse } from "next/server";
import { resetStoreForTests } from "@/server/store";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  }

  resetStoreForTests();
  return NextResponse.json({ ok: true });
}
