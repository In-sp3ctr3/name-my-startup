import { NextResponse } from "next/server";
import { getCurrentActor } from "@/server/auth";
import { errorResponse } from "@/server/api";
import { deleteReport, getReport } from "@/server/store";

export async function GET(_: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const actor = await getCurrentActor();
    const { reportId } = await params;
    const report = await getReport(actor, reportId);
    if (!report) return NextResponse.json({ error: "Report not found", code: "report_not_found" }, { status: 404 });
    return NextResponse.json({ report });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const actor = await getCurrentActor();
    const { reportId } = await params;
    const deleted = await deleteReport(actor, reportId);
    if (!deleted) return NextResponse.json({ error: "Report not found", code: "report_not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
