import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE } from '../src/lib/business-hours.js';
import {
  as,
  createSignedInUser,
  createTestContext,
  type TestContext,
  type TestUser,
} from './app.js';

let ctx: TestContext;
let admin: TestUser;
let agent: TestUser;

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());
beforeEach(async () => {
  await ctx.reset();
  admin = await createSignedInUser(ctx, 'admin');
  agent = await createSignedInUser(ctx, 'agent');
});

const schedule = {
  timezone: 'Europe/Bucharest',
  days: {
    ...DEFAULT_SCHEDULE.days,
    fri: { start: '09:00', end: '13:00' },
  },
  holidays: ['2026-12-25', '2026-01-01', '2026-12-25'],
};

describe('business hours', () => {
  it('defaults to Mon-Fri 9-17 UTC', async () => {
    expect((await as(ctx, agent).get('/api/settings/business-hours')).json()).toEqual(
      DEFAULT_SCHEDULE,
    );
  });

  it('validates the schedule', async () => {
    const bad = await as(ctx, admin).put('/api/settings/business-hours', {
      timezone: 'Mars/Olympus',
      days: DEFAULT_SCHEDULE.days,
      holidays: ['someday'],
    });
    expect(bad.statusCode).toBe(400);
    const paths = bad.json().error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['timezone', 'holidays.0']));
  });

  it('needs at least one working day', async () => {
    const days = Object.fromEntries(Object.keys(DEFAULT_SCHEDULE.days).map((d) => [d, null]));
    const res = await as(ctx, admin).put('/api/settings/business-hours', {
      ...schedule,
      days,
    });
    expect(res.statusCode).toBe(400);
  });

  it('can only be changed by admins', async () => {
    expect((await as(ctx, agent).put('/api/settings/business-hours', schedule)).statusCode).toBe(
      403,
    );
  });
});

describe('SLA policies', () => {
  it('returns defaults for every priority', async () => {
    const res = (await as(ctx, agent).get('/api/settings/sla')).json();
    expect(Object.keys(res).sort()).toEqual(['high', 'low', 'normal', 'urgent']);
    expect(res.urgent).toEqual({
      firstResponseMinutes: 60,
      resolutionMinutes: 480,
      businessHours: false,
    });
  });

  it('updates some priorities and keeps the rest', async () => {
    const res = await as(ctx, admin).put('/api/settings/sla', {
      high: { firstResponseMinutes: 30, resolutionMinutes: 240, businessHours: true },
    });
    expect(res.json().high.firstResponseMinutes).toBe(30);
    expect(res.json().normal.firstResponseMinutes).toBe(480);
  });

  it('rejects nonsense targets', async () => {
    const res = await as(ctx, admin).put('/api/settings/sla', {
      low: { firstResponseMinutes: 0, resolutionMinutes: -5, businessHours: 'yes' },
    });
    expect(res.statusCode).toBe(400);
  });
});
