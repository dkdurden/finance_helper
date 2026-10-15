export const applicationTimeZone =
  process.env.NEXT_PUBLIC_APP_TIME_ZONE?.trim() || "America/New_York";

const applicationDatePartsFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: applicationTimeZone,
  year: "numeric",
});

const calendarDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

const calendarMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

function getApplicationDateParts(value: Date) {
  const parts = applicationDatePartsFormatter.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;

  return {
    day: part("day"),
    month: part("month"),
    year: part("year"),
  };
}

export function getCurrentCalendarDate(now = new Date()) {
  const { day, month, year } = getApplicationDateParts(now);
  if (!day || !month || !year) throw new Error("Unable to determine the current date.");
  return `${year}-${month}-${day}`;
}

export function getCurrentYearMonth(now = new Date()) {
  const { month, year } = getApplicationDateParts(now);
  if (!month || !year) throw new Error("Unable to determine the current month.");
  return `${year}-${month}`;
}

export function formatCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return calendarDateFormatter.format(
    new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))),
  );
}

export function formatCalendarMonth(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month] = match;
  return calendarMonthFormatter.format(
    new Date(Date.UTC(Number(year), Number(month) - 1, 1)),
  );
}
