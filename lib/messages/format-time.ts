const TT_TIME_ZONE = "America/Port_of_Spain";

/** Trinidad-local labels with an explicit timezone to avoid server/client drift. */
export function formatConversationListTime(date: Date, now = new Date()): string {
  const then = date.getTime();
  const diffSec = Math.floor((now.getTime() - then) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Intl.DateTimeFormat("en-TT", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
    timeZone: TT_TIME_ZONE,
  }).format(date);
}

export function formatMessageTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-TT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TT_TIME_ZONE,
  }).format(date);
}
