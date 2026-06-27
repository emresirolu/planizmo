"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setViewModeAction } from "@/lib/actions/timeline";
import { can, type Plan } from "@/lib/billing/plan";

type ViewMode = "flow" | "timeline";

export default function ViewModeControl({ initial, plan = "free" }: { initial: ViewMode; plan?: Plan }) {
  const router = useRouter();
  const [mode, setMode] = useState<ViewMode>(initial);
  const [, startTransition] = useTransition();
  const timelineLocked = !can(plan, "timeline_mode");

  function pick(next: ViewMode) {
    if (next === mode) return;
    if (next === "timeline" && timelineLocked) {
      router.push("/dashboard/upgrade");
      return;
    }
    setMode(next);
    startTransition(() => void setViewModeAction(next));
  }

  return (
    <div
      className="flex items-center justify-between rounded-2xl border p-4"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div>
        <div className="text-sm font-medium">Default view</div>
        <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>
          How today's plan opens — a calm list, or an hour-by-hour timeline.
        </div>
      </div>
      <div className="flex rounded-full border p-0.5" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
        {(["flow", "timeline"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pick(m)}
            className="rounded-full px-3.5 py-1.5 text-[13px] font-medium capitalize"
            style={{ background: mode === m ? "var(--accent)" : "transparent", color: mode === m ? "#fff" : "var(--muted)", cursor: "pointer" }}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
