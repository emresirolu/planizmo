import type { Category } from "./categories";

export type ClientTimeBlock = {
  id: string;
  startTime: string; // 'HH:MM'
  durationMin: number;
  title: string;
  category: Category;
  completed: boolean;
};

/** 'HH:MM' (or 'HH:MM:SS') → '8:30 AM'. */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  let hour = Number(h);
  const min = m ?? "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${ampm}`;
}

/** End time label from start + duration. */
export function endLabel(hhmm: string, durationMin: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + (m || 0) + durationMin;
  const eh = Math.floor((total % (24 * 60)) / 60);
  const em = total % 60;
  return formatTime(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
}

export function isValidHHMM(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}
