import { NextResponse } from "next/server";
import { findReferrer, REFERRAL_COOKIE } from "@/lib/referrals";
import { REFERRAL_COOKIE_MAX_AGE, normalizeCode } from "@/lib/referrals/code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Referral entry point: https://planizmo.com/r/{code}
 * Validates the code, stores it in an httpOnly cookie, and sends the visitor to
 * sign-in. Invalid codes redirect too (no cookie set) — we never reveal whether
 * a code exists beyond the redirect behaviour, and never require a referral.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code: raw } = await params;
  const code = normalizeCode(raw);

  const res = NextResponse.redirect(new URL("/signin", req.url));
  if (code && (await findReferrer(code))) {
    res.cookies.set(REFERRAL_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
