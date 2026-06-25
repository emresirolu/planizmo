/**
 * Theme + accent design tokens (from the Planizmo design system).
 *
 * Each theme is a CSS-variable token set applied via `data-theme` on <html>.
 * The accent color is independent of the theme and applied as an inline
 * `--accent` custom property. The swatch values below are only used to render
 * the previews in Settings — the live tokens live in app/globals.css.
 */

export const THEMES = [
  { id: "cloud", name: "Cloud" },
  { id: "noir", name: "Noir" },
  { id: "peach", name: "Peach" },
  { id: "matcha", name: "Matcha" },
  { id: "mono", name: "Mono" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_IDS = THEMES.map((t) => t.id) as ThemeId[];

/** Preview swatches for the Settings theme picker. */
export const THEME_PREVIEW: Record<
  ThemeId,
  { bg: string; surface: string; border: string; accent: string }
> = {
  cloud: { bg: "#FAF9F6", surface: "#FFFFFF", border: "#ECEAE4", accent: "#4F6BED" },
  noir: { bg: "#0F0F11", surface: "#1A1A1E", border: "#2A2A30", accent: "#7C8CFF" },
  peach: { bg: "#FFF6F0", surface: "#FFFFFF", border: "#F6E3D8", accent: "#F0916B" },
  matcha: { bg: "#F4F6EF", surface: "#FFFFFF", border: "#E2E8D6", accent: "#719A5F" },
  mono: { bg: "#FAFAFA", surface: "#FFFFFF", border: "#E4E4E4", accent: "#111111" },
};

export const ACCENTS = [
  "#4F6BED",
  "#7C8CFF",
  "#F0916B",
  "#E86A8E",
  "#719A5F",
  "#2FA8A0",
  "#E0A53D",
] as const;

export const DEFAULT_THEME: ThemeId = "cloud";
export const DEFAULT_ACCENT = "#4F6BED";

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as string[]).includes(value);
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
