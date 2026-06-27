import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { addDays } from "@/lib/widgets/streak";
import { decryptToken, encryptToken } from "./crypto";
import type { DailyHealth, HealthProvider } from "./types";

/**
 * Fitbit OAuth + sync — SCAFFOLD. Only used when HEALTH_PROVIDER=fitbit and
 * FITBIT_CLIENT_ID / FITBIT_CLIENT_SECRET are present. Off by default; none of
 * this runs in the mock demo. Google Health would follow the same shape.
 */
const AUTH_URL = "https://www.fitbit.com/oauth2/authorize";
const TOKEN_URL = "https://api.fitbit.com/oauth2/token";
const API = "https://api.fitbit.com";

export function fitbitConfigured(): boolean {
  return Boolean(process.env.FITBIT_CLIENT_ID && process.env.FITBIT_CLIENT_SECRET);
}

function redirectUri(): string {
  const base = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/integrations/fitbit/callback`;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.FITBIT_CLIENT_ID!,
    response_type: "code",
    scope: "sleep activity",
    redirect_uri: redirectUri(),
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const basic = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri() }),
  });
  if (!res.ok) throw new Error(`Fitbit token exchange failed: ${res.status}`);
  const j = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return { accessToken: j.access_token, refreshToken: j.refresh_token, expiresIn: j.expires_in };
}

/** Persist (encrypted) tokens, upserting one row per (user, provider). */
export async function saveFitbitTokens(
  userId: string,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number },
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  const values = {
    accessToken: encryptToken(tokens.accessToken),
    refreshToken: encryptToken(tokens.refreshToken),
    expiresAt,
    lastSyncedAt: null as Date | null,
  };
  const [existing] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, "fitbit")))
    .limit(1);
  if (existing) {
    await db.update(integrations).set(values).where(eq(integrations.id, existing.id));
  } else {
    await db.insert(integrations).values({ userId, provider: "fitbit", ...values });
  }
}

export const fitbitProvider: HealthProvider = {
  name: "fitbit",
  async fetchRange(userId, fromDate, toDate): Promise<DailyHealth[]> {
    const [row] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, "fitbit")))
      .limit(1);
    if (!row?.accessToken) throw new Error("Fitbit not connected");
    const token = decryptToken(row.accessToken);
    const headers = { Authorization: `Bearer ${token}` };

    // Steps: activities time series; Sleep: sleep range.
    const stepsRes = await fetch(`${API}/1/user/-/activities/steps/date/${fromDate}/${toDate}.json`, { headers });
    const sleepRes = await fetch(`${API}/1.2/user/-/sleep/date/${fromDate}/${toDate}.json`, { headers });
    if (!stepsRes.ok || !sleepRes.ok) throw new Error("Fitbit fetch failed");

    const stepsJson = (await stepsRes.json()) as { "activities-steps"?: { dateTime: string; value: string }[] };
    const sleepJson = (await sleepRes.json()) as { sleep?: { dateOfSleep: string; minutesAsleep: number }[] };

    const byDate = new Map<string, DailyHealth>();
    let d = fromDate;
    while (d <= toDate) { byDate.set(d, { date: d, sleepHours: null, steps: null }); d = addDays(d, 1); }
    for (const s of stepsJson["activities-steps"] ?? []) {
      const e = byDate.get(s.dateTime);
      if (e) e.steps = Number(s.value);
    }
    for (const s of sleepJson.sleep ?? []) {
      const e = byDate.get(s.dateOfSleep);
      if (e) e.sleepHours = Math.round((s.minutesAsleep / 60) * 10) / 10;
    }
    await db.update(integrations).set({ lastSyncedAt: new Date() }).where(eq(integrations.id, row.id));
    return [...byDate.values()];
  },
};
