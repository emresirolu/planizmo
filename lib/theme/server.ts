import "server-only";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { DEFAULT_ACCENT, DEFAULT_THEME, type ThemeId } from "./themes";

/**
 * Resolve the theme + accent to apply for the current request.
 *
 * Read server-side so the correct tokens are present on the very first paint
 * (no flash) and follow the user across devices via their Neon profile row.
 * Falls back to defaults for unauthenticated visitors.
 */
export async function getThemeSettings(): Promise<{
  theme: ThemeId | string;
  accent: string;
}> {
  try {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) return { theme: DEFAULT_THEME, accent: DEFAULT_ACCENT };

    const [row] = await db
      .select({ theme: profiles.theme, accent: profiles.accentColor })
      .from(profiles)
      .where(eq(profiles.userId, id))
      .limit(1);

    return {
      theme: row?.theme ?? DEFAULT_THEME,
      accent: row?.accent ?? DEFAULT_ACCENT,
    };
  } catch {
    return { theme: DEFAULT_THEME, accent: DEFAULT_ACCENT };
  }
}
