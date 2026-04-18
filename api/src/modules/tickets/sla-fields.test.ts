import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE } from '../../lib/business-hours.js';
import { firstResponseFields, statusChangeFields } from './sla-fields.js';

const target = { firstResponseMinutes: 60, resolutionMinutes: 480, businessHours: true };
const createdAt = new Date('2026-03-04T10:00:00Z');
const open = {
  status: 'open' as const,
  createdAt,
  firstRespondedAt: new Date('2026-03-04T10:30:00Z'),
  slaPausedAt: null,
  slaPausedMinutes: 0,
};

describe('statusChangeFields', () => {
  it('starts the pause when a ticket goes to pending', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    const patch = statusChangeFields(open, 'pending', now, target, DEFAULT_SCHEDULE);
    expect(patch).toEqual({ status: 'pending', slaPausedAt: now });
  });

  it('adds the paused business time to the resolution target on resume', () => {
    const paused = {
      ...open,
      status: 'pending' as const,
      slaPausedAt: new Date('2026-03-04T12:00:00Z'),
    };
    // Paused 12:00 Wed -> 11:00 Thu = 5h Wed + 2h Thu = 420 business minutes.
    const patch = statusChangeFields(
      paused,
      'open',
      new Date('2026-03-05T11:00:00Z'),
      target,
      DEFAULT_SCHEDULE,
    );
    expect(patch.slaPausedAt).toBeNull();
    expect(patch.slaPausedMinutes).toBe(420);
    // 480 + 420 = 900 business minutes from Wed 10:00: 7h on Wed + 8h on Thu.
    expect(patch.resolutionDueAt?.toISOString()).toBe('2026-03-05T17:00:00.000Z');
  });

  it('keeps the clock paused when moving between paused statuses', () => {
    const paused = {
      ...open,
      status: 'pending' as const,
      slaPausedAt: new Date('2026-03-04T12:00:00Z'),
    };
    const patch = statusChangeFields(
      paused,
      'on_hold',
      new Date('2026-03-04T13:00:00Z'),
      target,
      DEFAULT_SCHEDULE,
    );
    expect(patch).toEqual({ status: 'on_hold' });
  });

  it('records the business minutes it took to solve, minus pauses', () => {
    const ticket = { ...open, slaPausedMinutes: 30 };
    const patch = statusChangeFields(
      ticket,
      'solved',
      new Date('2026-03-04T15:00:00Z'),
      target,
      DEFAULT_SCHEDULE,
    );
    expect(patch.solvedAt?.toISOString()).toBe('2026-03-04T15:00:00.000Z');
    expect(patch.resolutionMinutes).toBe(270);
  });

  it('counts the open part when solving straight from pending', () => {
    const paused = {
      ...open,
      status: 'pending' as const,
      slaPausedAt: new Date('2026-03-04T11:00:00Z'),
    };
    const patch = statusChangeFields(
      paused,
      'solved',
      new Date('2026-03-04T15:00:00Z'),
      target,
      DEFAULT_SCHEDULE,
    );
    expect(patch.slaPausedMinutes).toBe(240);
    expect(patch.resolutionMinutes).toBe(60);
  });

  it('clears the solve time when a ticket is reopened', () => {
    const solved = { ...open, status: 'solved' as const };
    const patch = statusChangeFields(
      solved,
      'open',
      new Date('2026-03-06T10:00:00Z'),
      target,
      DEFAULT_SCHEDULE,
    );
    expect(patch.solvedAt).toBeNull();
    expect(patch.resolutionMinutes).toBeNull();
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
