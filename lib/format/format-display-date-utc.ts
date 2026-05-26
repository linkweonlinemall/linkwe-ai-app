/** Calendar date in UTC for stable server/client JSX (avoids timezone/locale hydration mismatches). */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day = d.getUTCDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
