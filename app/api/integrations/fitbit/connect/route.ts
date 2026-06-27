import { auth } from "@/auth";
import { buildAuthUrl, fitbitConfigured } from "@/lib/health/fitbit";
import { selectedProviderName } from "@/lib/health/provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Start the Fitbit OAuth flow. Scaffold — only active when HEALTH_PROVIDER=fitbit. */
export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (selectedProviderName() !== "fitbit" || !fitbitConfigured()) {
    return Response.json(
      { ok: false, error: "Fitbit is not enabled (HEALTH_PROVIDER=fitbit + creds required)." },
      { status: 404 },
    );
  }
  // state = user id (kept simple for the scaffold)
  const url = buildAuthUrl(session.user.id);
  return Response.redirect(url, 302);
}
