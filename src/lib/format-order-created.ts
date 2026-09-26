const KATHMANDU = "Asia/Kathmandu";

const time12 = new Intl.DateTimeFormat("en-US", {
  timeZone: KATHMANDU,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dayMonth = new Intl.DateTimeFormat("en-US", {
  timeZone: KATHMANDU,
  month: "short",
  day: "numeric",
});

function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

function kathmanduCalendarDay(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: KATHMANDU }).format(value);
}

/** e.g. "3:45 PM" (12-hour, Asia/Kathmandu). */
export function formatOrderCreatedTime(value: string | Date): string {
  return time12.format(toDate(value));
}

/** e.g. "Created 3:45 PM" or "Created Sep 26, 3:45 PM" when not today. */
export function formatOrderCreatedAt(value: string | Date): string {
  const date = toDate(value);
  const time = formatOrderCreatedTime(date);
  if (kathmanduCalendarDay(date) === kathmanduCalendarDay(new Date())) {
    return `Created ${time}`;
  }
  return `Created ${dayMonth.format(date)}, ${time}`;
}
