import { auth } from "@/auth";
import { exchangeCodeForTokens, fitbitConfigured, saveFitbitTokens } from "@/lib/health/fitbit";
import { selectedProviderName } from "@/lib/health/provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Fitbit OAuth callback. Scaffold — stores encrypted tokens, off by default. */
export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (selectedProviderName() !== "fitbit" || !fitbitConfigured()) {
    return new Response("Fitbit not enabled", { status: 404 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || state !== session.user.id) {
    return new Response("Invalid callback", { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveFitbitTokens(session.user.id, tokens);
  } catch {
    return Response.redirect(new URL("/dashboard/health?fitbit=error", req.url), 302);
  }
  return Response.redirect(new URL("/dashboard/health?fitbit=connected", req.url), 302);
}
