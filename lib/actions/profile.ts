"use server";

import { updateMyProfile } from "@/lib/db/scoped";
import { isHexColor, isThemeId } from "@/lib/theme/themes";

type Result = { ok: boolean };

/** Persist the selected theme to the signed-in user's profile. */
export async function saveTheme(theme: string): Promise<Result> {
  if (!isThemeId(theme)) return { ok: false };
  await updateMyProfile({ theme });
  return { ok: true };
}

/** Persist the selected accent color to the signed-in user's profile. */
export async function saveAccent(accent: string): Promise<Result> {
  if (!isHexColor(accent)) return { ok: false };
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
