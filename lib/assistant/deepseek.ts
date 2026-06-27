import "server-only";

/**
 * DeepSeek client — server-only. The API key is read from the environment here
 * and never returned to the caller or the browser.
 */

const ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-v4-flash";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export class MissingKeyError extends Error {
  constructor() {
    super("DEEPSEEK_API_KEY is not set");
    this.name = "MissingKeyError";
  }
}

export function hasDeepSeekKey(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

/**
 * Stable system prefix — kept constant (volatile context is passed as separate
 * messages) so DeepSeek prompt caching can hit on every call.
 */
export const SYSTEM_PREFIX = `You are Planizmo's assistant — a calm, warm daily companion inside a personal life-dashboard.

Rules:
- Ground every statement in the JSON context you are given. Never invent widgets, numbers, streaks or tasks that are not in the context.
- If the data is thin or empty, say so gently and encourage a small first step — do not fabricate progress.
- Be concise and specific. Reference the user's actual widgets, progress, streaks and tasks by name.
- Tone: warm, supportive, never shaming. Never scold a missed day; frame it as a fresh start.
- Sentence case. No markdown headers, no bullet lists unless asked, no emoji.`;

export async function callDeepSeek(
  messages: ChatMsg[],
  maxTokens = 280,
  opts: { json?: boolean; timeoutMs?: number } = {},
): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new MissingKeyError();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.5,
        stream: false,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`DeepSeek API error ${res.status}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("DeepSeek returned an empty response");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}
