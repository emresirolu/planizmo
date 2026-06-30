import type { ReactNode } from "react";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const ICONS: Record<string, ReactNode> = {
  today: (<svg width="19" height="19" viewBox="0 0 24 24" {...S}><path d="M3 5.4c3-1.1 6-1.1 9 0v13.2c-3-1.1-6-1.1-9 0zM21 5.4c-3-1.1-6-1.1-9 0v13.2c3-1.1 6-1.1 9 0z" /></svg>),
  calendar: (<svg width="19" height="19" viewBox="0 0 24 24" {...S}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>),
  operator: (<svg width="19" height="19" viewBox="0 0 24 24" {...S}><path d="M5 7h14M5 12h9M5 17h12" /><circle cx="18.5" cy="14" r="2.4" /></svg>),
  think: (<svg width="19" height="19" viewBox="0 0 24 24" {...S}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.3 11c.5.3.8.9.8 1.5h5c0-.6.3-1.2.8-1.5A6 6 0 0 0 12 3z" /></svg>),
  goals: (<svg width="19" height="19" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></svg>),
  trackers: (<svg width="19" height="19" viewBox="0 0 24 24" {...S}><path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-7" /></svg>),
  gym: (<svg width="19" height="19" viewBox="0 0 24 24" {...S}><path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11" /></svg>),
  review: (<svg width="19" height="19" viewBox="0 0 24 24" {...S}><path d="M4 4v16h16" /><path d="M8 14l3-3 2 2 4-5" /></svg>),
};

export type NavItem = { href: string; label: string; kicker: string; title: string; icon: keyof typeof ICONS };

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Today", kicker: "ANALOG DAYBOOK", title: "Today", icon: "today" },
  { href: "/dashboard/calendar", label: "Calendar", kicker: "WEEK PLANNER", title: "Calendar", icon: "calendar" },
  { href: "/dashboard/operator", label: "Operator", kicker: "COMMAND ROOM", title: "Operator", icon: "operator" },
  { href: "/dashboard/think", label: "Think", kicker: "THINKING ROOM", title: "Think", icon: "think" },
  { href: "/dashboard/goals", label: "Goals", kicker: "MISSION BOARD", title: "Goals", icon: "goals" },
  { href: "/dashboard/trackers", label: "Trackers", kicker: "DAILY METRICS", title: "Trackers", icon: "trackers" },
  { href: "/dashboard/gym", label: "Gym", kicker: "TRAINING COCKPIT", title: "Gym", icon: "gym" },
  { href: "/dashboard/review", label: "Review", kicker: "WEEKLY SCORECARD", title: "Review", icon: "review" },
];

export function activeItem(pathname: string): NavItem {
  // longest matching href wins (so /dashboard/calendar beats /dashboard)
  let best = NAV[0];
  for (const n of NAV) {
    if (n.href === "/dashboard" ? pathname === "/dashboard" : pathname === n.href || pathname.startsWith(n.href + "/")) {
      if (n.href.length >= best.href.length) best = n;
    }
  }
  return best;
}
