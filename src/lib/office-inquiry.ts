/** 0 = Sunday … 6 = Saturday, matching store open hours. */
export const OFFICE_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type OfficeDay = (typeof OFFICE_DAYS)[number];

export const OFFICE_MEALS = ["lunch", "snacks", "both"] as const;
export type OfficeMeal = (typeof OFFICE_MEALS)[number];

export const HEADCOUNT_RANGES = [
  "5_10",
  "11_20",
  "21_40",
  "41_80",
  "81_150",
  "150_plus",
] as const;
export type HeadcountRange = (typeof HEADCOUNT_RANGES)[number];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const HEADCOUNT_LABELS: Record<HeadcountRange, string> = {
  "5_10": "5–10 people",
  "11_20": "11–20 people",
  "21_40": "21–40 people",
  "41_80": "41–80 people",
  "81_150": "81–150 people",
  "150_plus": "More than 150 people",
};

export const MEAL_LABELS: Record<OfficeMeal, string> = {
  lunch: "Lunch",
  snacks: "Snacks",
  both: "Lunch and snacks",
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isOfficeMeal(value: string): value is OfficeMeal {
  return (OFFICE_MEALS as readonly string[]).includes(value);
}

export function isHeadcountRange(value: string): value is HeadcountRange {
  return (HEADCOUNT_RANGES as readonly string[]).includes(value);
}

/** Unique weekdays in Sunday-first order, or null when the selection is bad. */
export function parseOfficeDays(values: string[]): OfficeDay[] | null {
  const days = [...new Set(values.map((v) => Number(v)))].filter((n) =>
    Number.isInteger(n),
  );
  if (days.length === 0 || days.some((d) => d < 0 || d > 6)) return null;
  return days.sort((a, b) => a - b) as OfficeDay[];
}

export function isClockTime(value: string): boolean {
  return TIME.test(value);
}

export function formatOfficeDays(days: number[]): string {
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES[d] ?? String(d))
    .join(", ");
}

/** Renders a stored "HH:MM" as a 12-hour clock, without shifting timezone. */
export function formatClockTime(value: string): string {
  const match = TIME.exec(value);
  if (!match) return value;
  const hours = Number(value.slice(0, 2));
  const minutes = value.slice(3);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}
