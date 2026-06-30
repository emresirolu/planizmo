import { NextResponse } from "next/server";
import { requireUserId, UnauthenticatedError } from "@/lib/db/scoped";
import { callDeepSeek, hasDeepSeekKey, type ChatMsg } from "@/lib/assistant/deepseek";
import { allowRequest } from "@/lib/assistant/ratelimit";

export const runtime = "nodejs";

const MODE_SYSTEM: Record<string, string> = {
  socratic: "You are a Socratic thinking partner. Do NOT give answers — ask 2-3 sharp, clarifying questions that help the person reach their own conclusion. Warm, precise. No preamble.",
  decision: "You are a decision coach. Lay out the real options, the key trade-off, and a clear recommendation with one sentence of why. End with a concrete next action.",
  idea: "You are an idea partner. Expand the thought into 3-5 concrete, surprising-but-grounded directions. Keep each to one line.",
  reflection: "You are a reflective guide. Help the person make sense of what happened: name the pattern, what it suggests, and one gentle adjustment. Calm, non-judgmental.",
  "devils-advocate": "You are a rigorous devil's advocate. Steelman the strongest case AGAINST the person's plan: the top 2-3 risks or blind spots, bluntly but fairly. End with the one thing they must de-risk.",
};

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    if (e instanceof UnauthenticatedError) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    throw e;
  }
  if (!allowRequest(userId)) return NextResponse.json({ ok: false, error: "Give me a moment — too many requests." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const mode = typeof body.mode === "string" && MODE_SYSTEM[body.mode] ? body.mode : "decision";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return NextResponse.json({ ok: false, error: "What are you working through?" }, { status: 400 });
  if (prompt.length > 2000) return NextResponse.json({ ok: false, error: "That's a lot — tighten it to the core." }, { status: 400 });

  if (!hasDeepSeekKey()) {
    return NextResponse.json({ ok: true, response: "Thinking partner needs a model key to respond. Meanwhile, write the decision and one next action below.", model: false });
  }

  const messages: ChatMsg[] = [
    { role: "system", content: MODE_SYSTEM[mode] + " Sentence case. No markdown headers. Keep it under 130 words." },
    { role: "user", content: prompt },
  ];
  try {
    const response = await callDeepSeek(messages, 320, { timeoutMs: 22_000 });
    return NextResponse.json({ ok: true, response, model: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Couldn't think that through just now — try again." }, { status: 502 });
  }
}
