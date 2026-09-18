export type PublicationDate =
  | { status: "dated"; dateTime: string; label: string }
  | { status: "missing" | "invalid" | "future" };

/** Display only the stored UTC publication timestamp; never substitute retrieval time. */
export function publicationDate(iso: string | undefined, now: Date = new Date()): PublicationDate {
  if (iso === undefined) return { status: "missing" };
  // Matches the feed's UTC datetime contract. Reject Date's permissive parsing
  // (including rolled-over calendar dates), rather than giving bad data a date.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(iso)) return { status: "invalid" };
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== iso.slice(0, 19)) return { status: "invalid" };
  if (date.getTime() > now.getTime()) return { status: "future" };
  return {
    status: "dated", dateTime: iso,
    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
  };
}
