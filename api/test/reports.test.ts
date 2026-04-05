import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  as,
  createSignedInUser,
  createTestContext,
  type TestContext,
  type TestUser,
} from './app.js';
import { openTicket } from './fixtures.js';

let ctx: TestContext;
let customer: TestUser;
let agent: TestUser;

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());
beforeEach(async () => {
  await ctx.reset();
  customer = await createSignedInUser(ctx, 'customer', 'Casey Morgan');
  agent = await createSignedInUser(ctx, 'agent', 'Alex Rivera');
});

async function at<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  ctx.setNow(iso);
  return fn();
}

const reply = (id: number, payload: Record<string, unknown>) =>
  as(ctx, agent).post(`/api/tickets/${id}/messages`, payload);

describe('GET /api/reports/overview', () => {
  beforeEach(async () => {
    // Mon 2 March: high priority, answered in 30 min, solved in 2h.
    const a = await at('2026-03-02T10:00:00Z', () =>
      openTicket(ctx, customer, { priority: 'high' }),
    );
    await at('2026-03-02T10:30:00Z', () => reply(a.id, { body: 'Hi' }));
    await at('2026-03-02T12:00:00Z', () => reply(a.id, { body: 'Fixed', status: 'solved' }));

    // Tue 3 March: high, first reply after 5 business hours (breach), solved next day.
    const b = await at('2026-03-03T09:00:00Z', () =>
      openTicket(ctx, customer, { priority: 'high' }),
    );
    await at('2026-03-03T14:00:00Z', () => reply(b.id, { body: 'Sorry' }));
    await at('2026-03-04T09:00:00Z', () => reply(b.id, { body: 'Done', status: 'solved' }));

    // Wed 4 March: normal, still waiting.
    await at('2026-03-04T11:00:00Z', () => openTicket(ctx, customer));
    ctx.setNow('2026-03-04T12:00:00Z');
  });

  it('summarizes volume, response times and SLA compliance', async () => {
    const res = await as(ctx, agent).get('/api/reports/overview?from=2026-03-02&to=2026-03-04');
    expect(res.statusCode).toBe(200);
    const report = res.json();

    expect(report.range).toEqual({ from: '2026-03-02', to: '2026-03-04', timezone: 'UTC' });
    expect(report.totals).toEqual({ created: 3, solved: 2, backlog: 1 });
    expect(report.volume).toEqual([
      { date: '2026-03-02', created: 1, solved: 1 },
      { date: '2026-03-03', created: 1, solved: 0 },
      { date: '2026-03-04', created: 1, solved: 1 },
    ]);
    expect(report.firstResponse).toEqual({ count: 2, medianMinutes: 165, averageMinutes: 165 });
    // Solved in 120 and 480 business minutes.
    expect(report.resolution).toEqual({ count: 2, medianMinutes: 300, averageMinutes: 300 });
    expect(report.sla.firstResponse).toEqual({ met: 1, breached: 1, rate: 0.5 });
    expect(report.sla.resolution).toEqual({ met: 2, breached: 0, rate: 1 });
  });

  it('breaks results down by priority and agent', async () => {
    const report = (
      await as(ctx, agent).get('/api/reports/overview?from=2026-03-02&to=2026-03-04')
    ).json();
    expect(report.byPriority.map((p: { priority: string }) => p.priority)).toEqual([
      'urgent',
      'high',
      'normal',
      'low',
    ]);
    expect(report.byPriority[1]).toMatchObject({ priority: 'high', created: 2 });
    expect(report.byAgent).toEqual([
      {
        id: agent.id,
        name: 'Alex Rivera',
        assigned: 2,
        solved: 2,
        medianFirstResponseMinutes: 165,
      },
    ]);
  });

  it('counts overdue unanswered tickets as breached', async () => {
    ctx.setNow('2026-03-06T12:00:00Z');
    const report = (
      await as(ctx, agent).get('/api/reports/overview?from=2026-03-02&to=2026-03-04')
    ).json();
    expect(report.sla.firstResponse).toEqual({ met: 1, breached: 2, rate: 1 / 3 });
  });

  it('groups days in the business-hours time zone', async () => {
    const admin = await createSignedInUser(ctx, 'admin', 'Dana Admin');
    const schedule = (await as(ctx, admin).get('/api/settings/business-hours')).json();
    await as(ctx, admin).put('/api/settings/business-hours', {
      ...schedule,
      timezone: 'Pacific/Auckland',
    });
    // Auckland is UTC+13 in March, so evening UTC is already the next day there.
    const report = (
      await as(ctx, agent).get('/api/reports/overview?from=2026-03-02&to=2026-03-04')
    ).json();
    expect(report.volume).toEqual([
      { date: '2026-03-02', created: 1, solved: 0 },
      { date: '2026-03-03', created: 1, solved: 1 },
      { date: '2026-03-04', created: 0, solved: 1 },
    ]);
    expect(report.totals.created).toBe(2);
  });
});
