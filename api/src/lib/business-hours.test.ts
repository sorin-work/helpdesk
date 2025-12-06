import { describe, expect, it } from 'vitest';
import { addBusinessMinutes, DEFAULT_SCHEDULE, type BusinessSchedule } from './business-hours.js';

const utc = (iso: string) => new Date(iso);
const iso = (date: Date) => date.toISOString();

// Mon-Fri 09:00-17:00 UTC. 2026-03-04 is a Wednesday.
const office = DEFAULT_SCHEDULE;

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

  it('skips holidays', () => {
    const withHoliday = { ...office, holidays: ['2026-03-05'] };
    expect(iso(addBusinessMinutes(utc('2026-03-04T16:00:00Z'), 120, withHoliday))).toBe(
      '2026-03-06T10:00:00.000Z',
    );
  });

  it('spans several days for long targets', () => {
    // 5 business days of 8h from Wednesday 10:00 -> next Wednesday 10:00
    expect(iso(addBusinessMinutes(utc('2026-03-04T10:00:00Z'), 5 * 8 * 60, office))).toBe(
      '2026-03-11T10:00:00.000Z',
    );
  });

  it('places windows in the schedule time zone', () => {
    // 08:00 in New York (EST, UTC-5): counting starts at 09:00 local = 14:00Z
    const newYork: BusinessSchedule = { ...DEFAULT_SCHEDULE, timezone: 'America/New_York' };
    expect(iso(addBusinessMinutes(utc('2026-03-04T13:00:00Z'), 60, newYork))).toBe(
      '2026-03-04T15:00:00.000Z',
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
});
