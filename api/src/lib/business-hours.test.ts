import { describe, expect, it } from 'vitest';
import {
  addBusinessMinutes,
  businessMinutesBetween,
  DEFAULT_SCHEDULE,
  zonedTimeToUtc,
  type BusinessSchedule,
} from './business-hours.js';

const utc = (iso: string) => new Date(iso);
const iso = (date: Date) => date.toISOString();

// Mon-Fri 09:00-17:00 UTC. 2026-03-04 is a Wednesday.
const office = DEFAULT_SCHEDULE;

const newYork: BusinessSchedule = { ...DEFAULT_SCHEDULE, timezone: 'America/New_York' };

describe('addBusinessMinutes', () => {
  it('adds plain minutes without a schedule', () => {
    expect(iso(addBusinessMinutes(utc('2026-03-07T23:30:00Z'), 90, null))).toBe(
      '2026-03-08T01:00:00.000Z',
    );
  });

  it('adds minutes within the same working day', () => {
    expect(iso(addBusinessMinutes(utc('2026-03-04T10:00:00Z'), 90, office))).toBe(
      '2026-03-04T11:30:00.000Z',
    );
  });

  it('carries the remainder over to the next working day', () => {
    expect(iso(addBusinessMinutes(utc('2026-03-04T16:00:00Z'), 120, office))).toBe(
      '2026-03-05T10:00:00.000Z',
    );
  });

  it('starts counting at opening time when created before hours', () => {
    expect(iso(addBusinessMinutes(utc('2026-03-04T06:15:00Z'), 30, office))).toBe(
      '2026-03-04T09:30:00.000Z',
    );
  });

  it('starts counting the next morning when created after hours', () => {
    expect(iso(addBusinessMinutes(utc('2026-03-04T19:00:00Z'), 60, office))).toBe(
      '2026-03-05T10:00:00.000Z',
    );
  });

  it('skips the weekend', () => {
    // Friday 16:00 + 2h -> Monday 10:00
    expect(iso(addBusinessMinutes(utc('2026-03-06T16:00:00Z'), 120, office))).toBe(
      '2026-03-09T10:00:00.000Z',
    );
  });

  it('skips tickets created on a weekend to Monday morning', () => {
    expect(iso(addBusinessMinutes(utc('2026-03-07T12:00:00Z'), 60, office))).toBe(
      '2026-03-09T10:00:00.000Z',
    );
  });

  it('skips holidays', () => {
    const withHoliday = { ...office, holidays: ['2026-03-05'] };
    expect(iso(addBusinessMinutes(utc('2026-03-04T16:00:00Z'), 120, withHoliday))).toBe(
      '2026-03-06T10:00:00.000Z',
    );
  });

  it('is due at closing time when the target ends exactly then', () => {
    expect(iso(addBusinessMinutes(utc('2026-03-04T15:00:00Z'), 120, office))).toBe(
      '2026-03-04T17:00:00.000Z',
    );
  });

  it('spans several days for long targets', () => {
    // 5 business days of 8h from Wednesday 10:00 -> next Wednesday 10:00
    expect(iso(addBusinessMinutes(utc('2026-03-04T10:00:00Z'), 5 * 8 * 60, office))).toBe(
      '2026-03-11T10:00:00.000Z',
    );
  });

  it('respects different hours per weekday', () => {
    const shortFriday: BusinessSchedule = {
      ...office,
      days: { ...office.days, fri: { start: '09:00', end: '12:00' } },
    };
    expect(iso(addBusinessMinutes(utc('2026-03-06T11:00:00Z'), 120, shortFriday))).toBe(
      '2026-03-09T10:00:00.000Z',
    );
  });

  it('places windows in the schedule time zone', () => {
    // 08:00 in New York (EST, UTC-5): counting starts at 09:00 local = 14:00Z
    expect(iso(addBusinessMinutes(utc('2026-03-04T13:00:00Z'), 60, newYork))).toBe(
      '2026-03-04T15:00:00.000Z',
    );
  });

  it('handles the daylight saving change', () => {
    // Fri 16:00 EST + 2h -> Mon 10:00 EDT (UTC-4) after clocks moved on Sun 8 March.
    expect(iso(addBusinessMinutes(utc('2026-03-06T21:00:00Z'), 120, newYork))).toBe(
      '2026-03-09T14:00:00.000Z',
    );
  });

  it('uses the local weekday, not the UTC one', () => {
    const tokyo: BusinessSchedule = { ...office, timezone: 'Asia/Tokyo' };
    // Sunday 23:30 UTC is already Monday 08:30 in Tokyo; opens at 09:00 local = 00:00Z.
    expect(iso(addBusinessMinutes(utc('2026-03-08T23:30:00Z'), 30, tokyo))).toBe(
      '2026-03-09T00:30:00.000Z',
    );
  });

  it('returns the start for zero minutes', () => {
    expect(iso(addBusinessMinutes(utc('2026-03-04T10:00:00Z'), 0, office))).toBe(
      '2026-03-04T10:00:00.000Z',
    );
  });

  it('rejects negative minutes', () => {
    expect(() => addBusinessMinutes(utc('2026-03-04T10:00:00Z'), -1, office)).toThrow(RangeError);
  });

  it('rejects a schedule without any working hours', () => {
    const closed: BusinessSchedule = {
      ...office,
      days: { sun: null, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null },
    };
    expect(() => addBusinessMinutes(utc('2026-03-04T10:00:00Z'), 10, closed)).toThrow(
      /no working hours/,
    );
  });
});

describe('businessMinutesBetween', () => {
  it('counts plain minutes without a schedule', () => {
    expect(
      businessMinutesBetween(utc('2026-03-07T10:00:00Z'), utc('2026-03-07T12:30:00Z'), null),
    ).toBe(150);
  });

  it('counts minutes inside one window', () => {
    expect(
      businessMinutesBetween(utc('2026-03-04T10:00:00Z'), utc('2026-03-04T12:15:00Z'), office),
    ).toBe(135);
  });

  it('ignores nights and weekends', () => {
    // Fri 16:00 -> Mon 10:00 = 1h on Friday + 1h on Monday
    expect(
      businessMinutesBetween(utc('2026-03-06T16:00:00Z'), utc('2026-03-09T10:00:00Z'), office),
    ).toBe(120);
  });

  it('is zero entirely outside hours', () => {
    expect(
      businessMinutesBetween(utc('2026-03-07T08:00:00Z'), utc('2026-03-08T20:00:00Z'), office),
    ).toBe(0);
  });

  it('is zero when the end is before the start', () => {
    expect(
      businessMinutesBetween(utc('2026-03-04T12:00:00Z'), utc('2026-03-04T10:00:00Z'), office),
    ).toBe(0);
  });

  it('is the inverse of addBusinessMinutes', () => {
    const starts = ['2026-03-04T09:00:00Z', '2026-03-05T16:59:00Z', '2026-03-06T12:34:00Z'];
    for (const start of starts) {
      for (const minutes of [1, 59, 480, 1234, 4800]) {
        const end = addBusinessMinutes(utc(start), minutes, newYork);
        expect(businessMinutesBetween(utc(start), end, newYork)).toBe(
          businessMinutesBetween(utc(start), addBusinessMinutes(utc(start), 0, newYork), newYork) +
            minutes,
        );
      }
    }
  });
});

describe('zonedTimeToUtc', () => {
  it('converts local wall-clock time to UTC', () => {
    const at = zonedTimeToUtc({ year: 2026, month: 7, day: 1 }, 9 * 60, 'Europe/Bucharest');
    expect(new Date(at).toISOString()).toBe('2026-07-01T06:00:00.000Z');
  });

  it('moves times skipped by daylight saving forward', () => {
    // 02:30 does not exist in New York on 8 March 2026.
    const at = zonedTimeToUtc({ year: 2026, month: 3, day: 8 }, 2 * 60 + 30, 'America/New_York');
    expect(new Date(at).toISOString()).toBe('2026-03-08T07:30:00.000Z');
  });
});
