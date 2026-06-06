import { count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { messages, tickets, users } from '../src/db/schema/index.js';
import { seedDemo } from '../src/seed/demo.js';
import { createTestContext, sessionCookie, type TestContext } from './app.js';

let ctx: TestContext;
const log = { info: () => {} };

beforeAll(async () => {
  ctx = await createTestContext();
  // The demo data is relative to the real clock, not the test clock.
  ctx.setNow(new Date());
  await seedDemo(ctx.db, ctx.config, log);
}, 60_000);
afterAll(() => ctx.close());

async function login(email: string, password: string) {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });
  expect(res.statusCode).toBe(200);
  return { role: res.json().role as string, cookie: sessionCookie(res) };
}

describe('demo seed', () => {
  it('creates the documented logins', async () => {
    expect((await login('demo@example.com', 'demo-password')).role).toBe('admin');
    expect((await login('agent@example.com', 'agent-password')).role).toBe('agent');
    expect((await login('customer@example.com', 'customer-password')).role).toBe('customer');
  });

  it('creates tickets in every stage with conversations', async () => {
    const [{ value: ticketCount }] = (await ctx.db.select({ value: count() }).from(tickets)) as [
      { value: number },
    ];
    expect(ticketCount).toBe(72);
    const statuses = await ctx.db
      .selectDistinct({ status: tickets.status })
      .from(tickets)
      .then((rows) => rows.map((r) => r.status).sort());
    expect(statuses).toEqual(
      expect.arrayContaining(['closed', 'new', 'open', 'pending', 'solved']),
    );

    const [{ value: notes }] = (await ctx.db
      .select({ value: count() })
      .from(messages)
      .where(eq(messages.internal, true))) as [{ value: number }];
    expect(notes).toBeGreaterThan(5);
  });

  it('gives the demo customer some requests to look at', async () => {
    const { cookie } = await login('customer@example.com', 'customer-password');
    const res = await ctx.app.inject({ url: '/api/tickets', headers: { cookie } });
    expect(res.json().total).toBeGreaterThanOrEqual(10);
  });

  it('fills the reports', async () => {
    const { cookie } = await login('demo@example.com', 'demo-password');
    const report = (
      await ctx.app.inject({ url: '/api/reports/overview', headers: { cookie } })
    ).json();
    expect(report.totals.created).toBeGreaterThan(30);
    expect(report.sla.firstResponse.rate).toBeGreaterThan(0.4);
    expect(report.sla.firstResponse.rate).toBeLessThan(1);
    expect(report.byAgent.length).toBeGreaterThanOrEqual(3);
  });

  it('does nothing the second time', async () => {
    expect(await seedDemo(ctx.db, ctx.config, log)).toBe(false);
    const [{ value }] = (await ctx.db.select({ value: count() }).from(users)) as [
      { value: number },
    ];
    expect(value).toBe(16);
  });
});
