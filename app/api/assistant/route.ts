import { auth } from "@/auth";
import {
  addAssistantMessage,
  countActionsSince,
  getMyPlan,
  getMyProfile,
  listRecentAssistantMessages,
  type AssistantMessage,
} from "@/lib/db/scoped";
import { can, LIMITS, UPGRADE_COPY } from "@/lib/billing/plan";
import { buildAssistantContext, type AssistantContext } from "@/lib/assistant/context";
import {
  SYSTEM_PREFIX,
  callDeepSeek,
  hasDeepSeekKey,
  type ChatMsg,
} from "@/lib/assistant/deepseek";
import { localChatReply, localSummary } from "@/lib/assistant/fallback";
import { runBuildList, runNextMove, runPlanDay } from "@/lib/assistant/actions";
import { allowRequest } from "@/lib/assistant/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function firstName(profileName?: string | null, sessionName?: string | null): string {
  return (
    profileName?.split(" ")[0] ?? sessionName?.split(" ")[0] ?? "there"
  );
}

function op(m: AssistantMessage): string | undefined {
  return (m.contextJson as { op?: string } | null)?.op;
}
function ctxDate(m: AssistantMessage): string | undefined {
  return (m.contextJson as { date?: string } | null)?.date;
}

function contextMessage(ctx: AssistantContext, name: string): string {
  return `Here is ${name}'s data for ${ctx.date} (${ctx.dayOfWeek}). Ground everything in it; do not invent anything not present.\n\n${JSON.stringify(ctx)}`;
}

async function generateSummary(ctx: AssistantContext, name: string): Promise<string> {
  if (!hasDeepSeekKey()) return localSummary(ctx, name);
  try {
    return await callDeepSeek(
      [
        { role: "system", content: SYSTEM_PREFIX },
        { role: "user", content: contextMessage(ctx, name) },
        {
          role: "user",
          content: `Write ${name}'s morning summary now: 2–3 warm sentences grounded in the data above, then one suggested focus for today.`,
        },
      ],
      200,
    );
  } catch {
    return localSummary(ctx, name);
  }
}

// GET — load history + today's daily summary (generated once per day).
export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const profile = await getMyProfile();
  const name = firstName(profile?.displayName, session.user.name);
  const { context, today } = await buildAssistantContext();
  const history = await listRecentAssistantMessages(50);

  const existing = history.find(
    (m) => m.role === "assistant" && op(m) === "summary" && ctxDate(m) === today,
  );

  let summary: string;
  if (existing) {
    summary = existing.content;
  } else {
    summary = await generateSummary(context, name);
    await addAssistantMessage({
      role: "assistant",
      content: summary,
      contextJson: { op: "summary", date: today, snapshot: context },
    });
  }

  const messages = history
    .filter((m) => op(m) === "chat" || op(m) === "nudge")
    .map((m) => ({ id: m.id, role: m.role, content: m.content }));

  return Response.json({ ok: true, summary, messages });
}

// POST — a grounded chat turn.
export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  if (!allowRequest(session.user.id)) {
    return Response.json(
      { ok: false, reply: "You're sending messages quickly — give me a moment." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { message?: unknown; action?: unknown };
  const message = String(body.message ?? "").trim().slice(0, 1000);
  const action = typeof body.action === "string" ? body.action : null;
  if (!message) return new Response("Bad Request", { status: 400 });

  const profile = await getMyProfile();
  const name = firstName(profile?.displayName, session.user.name);
  const { context, today } = await buildAssistantContext();
  const plan = await getMyPlan();

  // Plan gating for AI planning actions (server-side = source of truth).
  let gatedReply: string | null = null;
  if ((action === "replan_anchor" || action === "next_move") && !can(plan, "unlimited_ai_planning")) {
    gatedReply = action === "replan_anchor" ? UPGRADE_COPY.replan : UPGRADE_COPY.next_move;
  } else if (action === "plan_day" && !can(plan, "unlimited_ai_planning")) {
    const used = await countActionsSince("plan_day", new Date(Date.now() - 7 * 86400000));
    if (used >= LIMITS.planMyDayPerWeek) gatedReply = UPGRADE_COPY.plan_my_day;
  }

  await addAssistantMessage({
    role: "user",
    content: message,
    contextJson: { op: "chat", date: today, ...(action ? { action } : {}) },
  });

  let reply: string;
  let refresh = false;

  // Planning actions: the rail acts, writing through scoped helpers (reversible).
  if (gatedReply) {
    reply = gatedReply;
  } else if (action === "plan_day" || action === "replan_anchor") {
    const r = await runPlanDay(message, action === "replan_anchor");
    reply = r.reply;
    refresh = r.refresh;
  } else if (action === "next_move") {
    const r = await runNextMove();
    reply = r.reply;
    refresh = r.refresh;
  } else if (action === "build_list") {
    const r = await runBuildList(message);
    reply = r.reply;
    refresh = r.refresh;
  } else if (!hasDeepSeekKey()) {
    reply = localChatReply(context);
  } else {
    try {
      const history = await listRecentAssistantMessages(12);
      const priorChat: ChatMsg[] = history
        .filter((m) => op(m) === "chat")
        .slice(0, -1) // exclude the message we just added (added last below)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      reply = await callDeepSeek(
        [
          { role: "system", content: SYSTEM_PREFIX },
          { role: "user", content: contextMessage(context, name) },
          ...priorChat,
          { role: "user", content: message },
        ],
        240,
      );
    } catch {
      reply = localChatReply(context);
    }
  }

  const saved = await addAssistantMessage({
    role: "assistant",
    content: reply,
    contextJson: { op: "chat", date: today, snapshot: context },
  });

  return Response.json({ ok: true, reply, id: saved.id, refresh, upgrade: gatedReply != null });
}
