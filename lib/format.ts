// All times are shown in Pittsburgh time, wherever the viewer is.
const TIME_ZONE = "America/New_York";

const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

/** "Fri, Oct 9 · 7:30 PM" */
export function formatEventDate(iso: string): string {
  const date = new Date(iso);
  // Some ICU versions use a narrow no-break space before AM/PM; normalize it.
  const time = timeFormat.format(date).replace(/ /g, " ");
  return `${dayFormat.format(date)} · ${time}`;
}

/** 1200 -> "$12.00", 0 -> "Free" */
export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}
