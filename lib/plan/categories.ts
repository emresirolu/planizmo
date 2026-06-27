export const CATEGORIES = [
  "focus",
  "break",
  "personal",
  "work",
  "health",
  "planning",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLOR: Record<Category, string> = {
  focus: "#4F6BED",
  break: "#2FA8A0",
  personal: "#E0A53D",
  work: "#7C8CFF",
  health: "#3FB984",
  planning: "#E86A8E",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  focus: "Focus",
  break: "Break",
  personal: "Personal",
  work: "Work",
  health: "Health",
  planning: "Planning",
};

export function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}

/** Map a widget type to a sensible default category (for plan tags). */
export function categoryForWidgetType(type: string): Category {
  switch (type) {
    case "health":
      return "health";
    case "habit":
    case "counter":
    case "reading":
      return "personal";
    case "checklist":
      return "planning";
    default:
      return "work";
  }
}
