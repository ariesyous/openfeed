const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** Formats an ISO timestamp as a short relative label, e.g. "5m", "3h", "2d". */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now.getTime() - then);

  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;
  if (diff < 5 * WEEK) return `${Math.floor(diff / WEEK)}w`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: now.getFullYear() === new Date(iso).getFullYear() ? undefined : "numeric",
  });
}
