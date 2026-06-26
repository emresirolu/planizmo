/**
 * Today's calendar date (YYYY-MM-DD) in a given IANA timezone.
 *
 * Used so a tap near midnight lands on the correct day for the user, not on
 * the server's UTC day. `en-CA` formats as YYYY-MM-DD.
 */
export function todayInTimeZone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
}

/** A Date anchored to midnight of the user's local day (for weekday checks). */
export function localDate(timeZone: string): Date {
  const iso = todayInTimeZone(timeZone);
  return new Date(`${iso}T00:00:00`);
}
