type TimeInput = string | number | Date;

function toDate(input: TimeInput): Date {
  return input instanceof Date ? input : new Date(input);
}

/**
 * Short relative time for activity feeds ("5m ago", "3h ago"). Falls back to
 * a short date once the gap exceeds a week so old items don't read as "12d ago".
 */
export function formatRelativeTime(input: TimeInput): string {
  const date = toDate(input);
  const diff = Date.now() - date.getTime();
  if (diff < 0 || diff < 5_000) return 'just now';

  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;

  return formatFullDate(date);
}

/** Time-of-day for chat bubbles and message lists ("2:45 PM"). */
export function formatMessageTime(input: TimeInput): string {
  return toDate(input).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Compact date for older items, including the year when it's not the current one. */
export function formatFullDate(input: TimeInput): string {
  const date = toDate(input);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-US', sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}
