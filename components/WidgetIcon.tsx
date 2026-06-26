type Props = { name: string; size?: number };

/**
 * Flat line/solid icons matching the Planizmo design language. `name` is the
 * key stored on widgets.icon.
 */
export default function WidgetIcon({ name, size = 19 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "water":
      return (
        <svg {...common}>
          <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
        </svg>
      );
    case "gym":
      return (
        <svg {...common}>
          <path d="M4 12h16" />
          <path d="M6.5 8.5v7M3.5 10v4" />
          <path d="M17.5 8.5v7M20.5 10v4" />
        </svg>
      );
    case "sleep":
      return (
        <svg {...common}>
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
        </svg>
      );
    case "steps":
      return (
        <svg {...common}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case "mood":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.4 14.4c1 1.1 2.2 1.7 3.6 1.7s2.6-.6 3.6-1.7" />
          <path d="M9 9.5h.01M15 9.5h.01" />
        </svg>
      );
    case "reading":
      return (
        <svg {...common}>
          <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H11v16H4.5A1.5 1.5 0 0 1 3 18.5z" />
          <path d="M21 5.5A1.5 1.5 0 0 0 19.5 4H13v16h6.5A1.5 1.5 0 0 0 21 18.5z" />
        </svg>
      );
    case "checklist":
      return (
        <svg {...common}>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <path d="M4 5.5 5 6.5 6.5 4.5M4 11.5l1 1 1.5-2M4 17.5l1 1 1.5-2" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8.5 12l2.2 2.2L15.5 9.5" />
        </svg>
      );
    case "counter":
    default:
      return (
        <svg {...common}>
          <path d="M4 9h16M4 15h16M10 4l-1.5 16M16 4l-1.5 16" />
        </svg>
      );
  }
}
