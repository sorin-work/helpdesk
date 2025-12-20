/**
 * Business-hours arithmetic.
 *
 * A schedule has one working window per weekday in a given IANA time zone,
 * plus a list of holidays (local dates). All inputs and outputs are UTC
 * instants; the time zone only decides where the windows fall. Passing
 * `null` as the schedule means "24/7", i.e. plain wall-clock minutes.
 */

export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface DayHours {
  /** "HH:MM", 24h clock. */
  start: string;
  end: string;
}

export interface BusinessSchedule {
  timezone: string;
  /** `null` marks a day off. */
  days: Record<Weekday, DayHours | null>;
  /** Local dates ("YYYY-MM-DD") with no working hours. */
  holidays: string[];
}

export const DEFAULT_SCHEDULE: BusinessSchedule = {
  timezone: 'UTC',
  days: {
    sun: null,
    mon: { start: '09:00', end: '17:00' },
    tue: { start: '09:00', end: '17:00' },
    wed: { start: '09:00', end: '17:00' },
    thu: { start: '09:00', end: '17:00' },
    fri: { start: '09:00', end: '17:00' },
    sat: null,
  },
  holidays: [],
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
// Ten years of days is far beyond any SLA target; stops runaway loops.
const MAX_DAYS = 3660;

interface CivilDate {
  year: number;
  month: number; // 1-12
  day: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timezone, formatter);
  }
  return formatter;
}

export function isValidTimezone(timezone: string): boolean {
  try {
    formatterFor(timezone);
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock parts of an instant in a time zone. */
function zonedParts(instant: number, timezone: string) {
  const parts: Record<string, number> = {};
  for (const part of formatterFor(timezone).formatToParts(new Date(instant))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
    hour: parts.hour!,
    minute: parts.minute!,
    second: parts.second!,
  };
}

/** Offset of the zone from UTC at an instant, in milliseconds. */
function offsetAt(instant: number, timezone: string): number {
  const p = zonedParts(instant, timezone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** UTC instant of a local wall-clock time. */
export function zonedTimeToUtc(date: CivilDate, minutesOfDay: number, timezone: string): number {
  const guess = Date.UTC(date.year, date.month - 1, date.day) + minutesOfDay * MINUTE;
  const first = guess - offsetAt(guess, timezone);
  const second = guess - offsetAt(first, timezone);
  return second;
}

function localDate(instant: number, timezone: string): CivilDate {
  const p = zonedParts(instant, timezone);
  return { year: p.year, month: p.month, day: p.day };
}

function nextDate(date: CivilDate): CivilDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day) + DAY);
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function isoDate(date: CivilDate): string {
  const mm = String(date.month).padStart(2, '0');
  const dd = String(date.day).padStart(2, '0');
  return `${date.year}-${mm}-${dd}`;
}

export function parseClock(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error(`Invalid time "${value}", expected HH:MM`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** The working window of a local date as UTC instants, or null on days off. */
function windowFor(date: CivilDate, schedule: BusinessSchedule): [number, number] | null {
  if (schedule.holidays.includes(isoDate(date))) return null;
  const weekday = WEEKDAYS[new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()]!;
  const hours = schedule.days[weekday];
  if (!hours) return null;
  const start = parseClock(hours.start);
  const end = parseClock(hours.end);
  if (end <= start) return null;
  return [
    zonedTimeToUtc(date, start, schedule.timezone),
    zonedTimeToUtc(date, end, schedule.timezone),
  ];
}

export function hasWorkingTime(schedule: BusinessSchedule): boolean {
  return WEEKDAYS.some((day) => {
    const hours = schedule.days[day];
    return hours !== null && parseClock(hours.end) > parseClock(hours.start);
  });
}

/**
 * The instant that lies `minutes` business minutes after `start`. A start
 * outside working hours begins counting at the next window.
 */
export function addBusinessMinutes(
  start: Date,
  minutes: number,
  schedule: BusinessSchedule | null,
): Date {
  if (minutes < 0) throw new RangeError('minutes must not be negative');
  if (!schedule) return new Date(start.getTime() + minutes * MINUTE);
  if (!hasWorkingTime(schedule)) throw new Error('Schedule has no working hours');

  let remaining = minutes * MINUTE;
  const cursor = start.getTime();
  let date = localDate(cursor, schedule.timezone);

  for (let i = 0; i < MAX_DAYS; i++) {
    const window = windowFor(date, schedule);
    if (window) {
      const from = Math.max(cursor, window[0]);
      if (from < window[1]) {
        const available = window[1] - from;
        // A target that runs out exactly at closing time is due at closing
        // time, not at the next opening.
        if (remaining <= available) return new Date(from + remaining);
        remaining -= available;
      }
    }
    date = nextDate(date);
  }
  throw new Error('Business-hours calculation did not converge');
}

/** Business minutes elapsed between two instants (0 if `to` is not after `from`). */
export function businessMinutesBetween(
  from: Date,
  to: Date,
  schedule: BusinessSchedule | null,
): number {
  const start = from.getTime();
  const end = to.getTime();
  if (end <= start) return 0;
  if (!schedule) return Math.round((end - start) / MINUTE);

  let total = 0;
  let date = localDate(start, schedule.timezone);
  const last = isoDate(localDate(end, schedule.timezone));

  for (let i = 0; i < MAX_DAYS; i++) {
    const window = windowFor(date, schedule);
    if (window) {
      const overlap = Math.min(end, window[1]) - Math.max(start, window[0]);
      if (overlap > 0) total += overlap;
    }
    if (isoDate(date) >= last) break;
    date = nextDate(date);
  }
  return Math.round(total / MINUTE);
}
