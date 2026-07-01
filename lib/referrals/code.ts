import { randomBytes } from "node:crypto";

/**
 * Pure referral constants + code helpers. No DB, no cookies, no auth — safe to
 * import from anywhere server-side (including the Auth.js config) without
 * creating an import cycle.
 */

/** Cookie that carries a visited referral code from /r/[code] into sign-up. */
export const REFERRAL_COOKIE = "referral_code";
/** How long the stored referral code survives before sign-up (30 days). */
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Reward sizing (the single source of truth for the referral economy). */
export const FRIEND_TRIAL_DAYS = 7; // friend who signs up through a link
export const REFERRER_REWARD_DAYS = 30; // referrer, per completed milestone
export const REFERRALS_PER_MILESTONE = 3; // completed friends per referrer month
/** Abuse cap: at most this many referrer milestones ever (≈ 1 year of Pro). */
export const MAX_REFERRAL_MILESTONES = 12;

// Crockford-ish alphabet — no 0/O/1/I/L to keep codes easy to read and share.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 7;

/** A random, human-friendly referral code (≈ 27 billion combinations). */
export function generateReferralCode(len: number = CODE_LEN): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

/** Normalize a code from a URL/cookie to the canonical stored form. */
export function normalizeCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

/** Base URL for referral links — env-aware, defaults to the production domain. */
export function referralBaseUrl(): string {
  const base =
    process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://planizmo.com";
  return base.replace(/\/+$/, "");
}

/** Full shareable link for a code, e.g. https://planizmo.com/r/AB2CD34 */
export function referralLink(code: string): string {
  return `${referralBaseUrl()}/r/${code}`;
}
