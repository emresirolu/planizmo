"use server";

import { getMyPlan, updateMyProfile } from "@/lib/db/scoped";
import { isHexColor, isThemeId } from "@/lib/theme/themes";
import { can, themeAllowed, UPGRADE_COPY } from "@/lib/billing/plan";

type Result = { ok: boolean; error?: string; upgrade?: boolean };

/** Persist the selected theme to the signed-in user's profile. */
export async function saveTheme(theme: string): Promise<Result> {
  if (!isThemeId(theme)) return { ok: false };
  if (!themeAllowed(await getMyPlan(), theme)) {
    return { ok: false, upgrade: true, error: UPGRADE_COPY.theme };
  }
  await updateMyProfile({ theme });
  return { ok: true };
}

/** Persist the selected accent color to the signed-in user's profile. */
export async function saveAccent(accent: string): Promise<Result> {
  if (!isHexColor(accent)) return { ok: false };
  if (!can(await getMyPlan(), "accent")) {
    return { ok: false, upgrade: true, error: UPGRADE_COPY.accent };
  }
  await updateMyProfile({ accentColor: accent });
  return { ok: true };
}

/**
 * Persist the user's IANA timezone (detected client-side) so "today" is
 * computed against their local day. Validated against the runtime's tz set.
 */
export async function saveTimezone(timezone: string): Promise<Result> {
  try {
    // Throws RangeError for an unknown timezone.
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
  } catch {
    return { ok: false };
  }
  await updateMyProfile({ timezone });
  return { ok: true };
}
