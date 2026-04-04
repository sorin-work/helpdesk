import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE } from '../../lib/business-hours.js';
import { firstResponseFields, statusChangeFields } from './sla-fields.js';

const target = { firstResponseMinutes: 60, resolutionMinutes: 480, businessHours: true };
const createdAt = new Date('2026-03-04T10:00:00Z');
const open = {
  status: 'open' as const,
  createdAt,
  firstRespondedAt: new Date('2026-03-04T10:30:00Z'),
};

describe('statusChangeFields', () => {
  it('records the business minutes it took to solve', () => {
    const ticket = open;
    const patch = statusChangeFields(
      ticket,
      'solved',
      new Date('2026-03-04T15:00:00Z'),
      target,
      DEFAULT_SCHEDULE,
    );
    expect(patch.solvedAt?.toISOString()).toBe('2026-03-04T15:00:00.000Z');
    expect(patch.resolutionMinutes).toBe(300);
  });

  it('stamps closedAt when closing', () => {
    const solved = { ...open, status: 'solved' as const };
    const now = new Date('2026-03-12T10:00:00Z');
    expect(statusChangeFields(solved, 'closed', now, target, DEFAULT_SCHEDULE).closedAt).toEqual(
      now,
    );
  });
});

describe('firstResponseFields', () => {
  it('measures the first response in business minutes', () => {
    // Created Friday 16:30, answered Monday 09:15: 30 + 15 minutes.
    const fields = firstResponseFields(
      { createdAt: new Date('2026-03-06T16:30:00Z') },
      new Date('2026-03-09T09:15:00Z'),
      target,
      DEFAULT_SCHEDULE,
    );
    expect(fields.firstResponseMinutes).toBe(45);
  });

  it('measures wall-clock minutes for 24/7 policies', () => {
    const fields = firstResponseFields(
      { createdAt: new Date('2026-03-06T16:30:00Z') },
      new Date('2026-03-09T09:15:00Z'),
      { ...target, businessHours: false },
      DEFAULT_SCHEDULE,
    );
    expect(fields.firstResponseMinutes).toBe(3885);
  });
});
