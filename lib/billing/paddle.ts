import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export type PaddlePublicConfig = {
  clientToken: string | null;
  environment: "sandbox" | "production";
  priceMonthly: string | null;
  priceAnnual: string | null;
};

/** Public Paddle config (client token + price IDs are browser-safe). */
export function paddleConfig(): PaddlePublicConfig {
  return {
    clientToken: process.env.PADDLE_CLIENT_TOKEN || null,
    environment: process.env.PADDLE_ENV === "production" ? "production" : "sandbox",
    priceMonthly: process.env.PADDLE_PRICE_MONTHLY || null,
    priceAnnual: process.env.PADDLE_PRICE_ANNUAL || null,
  };
}

/** Live checkout requires a client token and at least one price id. */
export function checkoutEnabled(): boolean {
  const c = paddleConfig();
  return Boolean(c.clientToken && (c.priceMonthly || c.priceAnnual));
}

/** Verify the Paddle-Signature header (ts=...;h1=...) for Paddle Billing webhooks. */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !signatureHeader) return false;
  const parts: Record<string, string> = {};
  for (const kv of signatureHeader.split(";")) {
    const [k, v] = kv.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const { ts, h1 } = parts;
  if (!ts || !h1) return false;
  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(h1, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
