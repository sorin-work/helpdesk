import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE } from './business-hours.js';
import { computeDueDates, slaSummary } from './sla.js';

const created = new Date('2026-03-04T10:00:00Z');
const target = { firstResponseMinutes: 60, resolutionMinutes: 480, businessHours: true };

const base = {
  firstResponseDueAt: new Date('2026-03-04T11:00:00Z'),
  resolutionDueAt: new Date('2026-03-05T10:00:00Z'),
  firstRespondedAt: null,
  solvedAt: null,
};

describe('computeDueDates', () => {
  it('uses business hours when the policy asks for it', () => {
    const due = computeDueDates(created, target, DEFAULT_SCHEDULE);
    expect(due.firstResponseDueAt.toISOString()).toBe('2026-03-04T11:00:00.000Z');
    expect(due.resolutionDueAt.toISOString()).toBe('2026-03-05T10:00:00.000Z');
  });

  it('runs on the wall clock for 24/7 policies', () => {
    const due = computeDueDates(created, { ...target, businessHours: false }, DEFAULT_SCHEDULE);
    expect(due.resolutionDueAt.toISOString()).toBe('2026-03-04T18:00:00.000Z');
  });
});

describe('slaSummary', () => {
  it('is on track well before the target', () => {
    const sla = slaSummary(base, new Date('2026-03-04T09:30:00Z'));
    expect(sla.firstResponse.state).toBe('on_track');
    expect(sla.resolution.state).toBe('on_track');
  });

  it('is breached once the target has passed', () => {
    const sla = slaSummary(base, new Date('2026-03-04T11:00:01Z'));
    expect(sla.firstResponse.state).toBe('breached');
  });

  it('is met when the reply came in time, however late it is now', () => {
    const sla = slaSummary(
      { ...base, firstRespondedAt: new Date('2026-03-04T10:45:00Z') },
      new Date('2026-03-10T00:00:00Z'),
    );
    expect(sla.firstResponse.state).toBe('met');
  });
});
