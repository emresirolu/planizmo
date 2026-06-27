import { auth } from "@/auth";
import { getMyPlan, getMyProfile } from "@/lib/db/scoped";
import { syncHealthForUser } from "@/lib/health/sync";
import { can, UPGRADE_COPY } from "@/lib/billing/plan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Manual "Sync now" — syncs the signed-in user's health from the active provider. */
export async function POST(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!can(await getMyPlan(), "health_sync")) {
    return Response.json({ ok: false, upgrade: true, error: UPGRADE_COPY.health_sync }, { status: 403 });
  }
  try {
    const profile = await getMyProfile();
    const r = await syncHealthForUser(session.user.id, profile?.timezone || "UTC");
    return Response.json({ ok: true, ...r });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Sync failed" },
      { status: 502 },
    );
  }
}
