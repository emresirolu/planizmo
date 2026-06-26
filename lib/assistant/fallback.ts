import type { AssistantContext } from "./context";

/**
 * Deterministic, grounded fallbacks used when DEEPSEEK_API_KEY is missing or the
 * API errors — still references the user's real data so the rail stays useful
 * instead of crashing or showing filler.
 */

export function localSummary(ctx: AssistantContext, name: string): string {
  const { scheduledToday, completedToday } = ctx.totals;
  const parts: string[] = [];

  if (scheduledToday === 0 && ctx.tasks.openCount === 0) {
    return `Morning, ${name}. Nothing's scheduled yet — add a widget or two and I'll help you keep the rhythm. A small start counts.`;
  }

  parts.push(
    `Morning, ${name}. You've got ${scheduledToday} thing${scheduledToday === 1 ? "" : "s"} on today` +
      (completedToday > 0 ? ` and ${completedToday} already done.` : "."),
  );

  if (ctx.tasks.overdue.length > 0) {
    parts.push(`${ctx.tasks.overdue[0].title} is overdue — worth a quick look.`);
  } else if (ctx.tasks.dueToday.length > 0) {
    parts.push(`${ctx.tasks.dueToday[0]} is due today.`);
  }

  const focus = pickFocus(ctx);
  if (focus) parts.push(`Focus: ${focus}.`);
  return parts.join(" ");
}

export function localChatReply(ctx: AssistantContext): string {
  const focus = pickFocus(ctx);
  if (focus) {
    return `My assistant brain is offline right now, but from your data: ${focus} looks like the best next step today.`;
  }
  return `My assistant brain is offline right now. Once you've added a few widgets I can give you grounded nudges.`;
}

function pickFocus(ctx: AssistantContext): string | null {
  // an incomplete, scheduled, streak-ish widget first
  const widget = ctx.widgets.find((w) => w.scheduledToday && !w.completed);
  if (widget) {
    if (widget.target != null && widget.value != null) {
      return `${widget.title} (${widget.value}/${widget.target}${widget.unit ? ` ${widget.unit}` : ""})`;
    }
    return widget.title;
  }
  const checklist = ctx.checklists.find((c) => !c.completed && c.total > 0);
  if (checklist) return `${checklist.title} (${checklist.done}/${checklist.total})`;
  if (ctx.tasks.dueToday.length > 0) return ctx.tasks.dueToday[0];
  if (ctx.tasks.overdue.length > 0) return ctx.tasks.overdue[0].title;
  return null;
}
