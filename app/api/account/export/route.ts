import { NextResponse } from "next/server";
import { exportMyData, requireUserId, UnauthenticatedError } from "@/lib/db/scoped";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireUserId();
  } catch (e) {
    if (e instanceof UnauthenticatedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    throw e;
  }

  let data: Record<string, unknown>;
  try {
    data = await exportMyData();
  } catch {
    return NextResponse.json({ error: "Couldn't build your export — try again." }, { status: 500 });
  }

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="planizmo-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
