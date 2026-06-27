import { auth } from "@/auth";
import { addWidget, toClientWidget } from "@/lib/db/scoped";
import { allowRequest } from "@/lib/assistant/ratelimit";
import { parseWidgetSpec } from "@/lib/assistant/widget-setup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Describe-to-add: turn a short description into a single widget. */
export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!allowRequest(session.user.id)) {
    return Response.json({ ok: false, error: "Slow down a moment." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { description?: unknown };
  const description = String(body.description ?? "").trim().slice(0, 200);
  if (!description) return Response.json({ ok: false, error: "Describe the widget" }, { status: 400 });

  try {
    const spec = await parseWidgetSpec(description);
    const w = await addWidget(spec);
    return Response.json({ ok: true, widget: toClientWidget(w) });
  } catch {
    return Response.json({ ok: false, error: "Couldn't create that — try the presets." }, { status: 500 });
  }
}
