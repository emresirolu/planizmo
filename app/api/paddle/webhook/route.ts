import { verifyPaddleSignature } from "@/lib/billing/paddle";
import { applySubscription } from "@/lib/billing/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Paddle Billing webhook → subscription state. Verifies the signature, then on
 * subscription.created/updated/canceled upserts the subscription + flips
 * profiles.plan. Idempotent.
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "Webhook not configured" }, { status: 503 });
  }

  const raw = await req.text();
  if (!verifyPaddleSignature(raw, req.headers.get("paddle-signature"), secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: {
    event_type?: string;
    data?: {
      id?: string;
      status?: string;
      custom_data?: { user_id?: string } | null;
      current_billing_period?: { ends_at?: string } | null;
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  const type = event.event_type ?? "";
  const data = event.data ?? {};
  const userId = data.custom_data?.user_id;

  // Only subscription events with a mapped user are actionable; ack the rest.
  if (type.startsWith("subscription.") && userId) {
    const status = type === "subscription.canceled" ? "canceled" : (data.status ?? "active");
    const ends = data.current_billing_period?.ends_at;
    await applySubscription(userId, {
      paddleSubscriptionId: data.id ?? null,
      status,
      currentPeriodEnd: ends ? new Date(ends) : null,
    });
  }

  return Response.json({ ok: true });
}
