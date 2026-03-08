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
let admin: TestUser;
let customer: TestUser;

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());
beforeEach(async () => {
  await ctx.reset();
  admin = await createSignedInUser(ctx, 'admin', 'Dana Admin');
  customer = await createSignedInUser(ctx, 'customer', 'Casey Morgan');
});

const assignees = async (count: number) => {
  const names: (string | null)[] = [];
  for (let i = 0; i < count; i++) {
    const ticket = await openTicket(ctx, customer);
    names.push((ticket.assignee as { name: string } | null)?.name ?? null);
  }
  return names;
};

describe('round-robin auto-assign', () => {
  it('is off by default', async () => {
    await createSignedInUser(ctx, 'agent', 'Alex');
    expect(await assignees(1)).toEqual([null]);
  });

  it('rotates new tickets across agents', async () => {
    await createSignedInUser(ctx, 'agent', 'Alex');
    await createSignedInUser(ctx, 'agent', 'Priya');
    await createSignedInUser(ctx, 'agent', 'Tom');
    await as(ctx, admin).put('/api/settings/assignment', { autoAssign: true });

    expect(await assignees(5)).toEqual(['Alex', 'Priya', 'Tom', 'Alex', 'Priya']);
  });

  it('skips agents who are away', async () => {
    const alex = await createSignedInUser(ctx, 'agent', 'Alex');
    await createSignedInUser(ctx, 'agent', 'Tom');
    await as(ctx, admin).put('/api/settings/assignment', { autoAssign: true });

    await createSignedInUser(ctx, 'agent', 'Priya');
    await as(ctx, alex).patch('/api/auth/me', { available: false });

    expect(await assignees(2)).toEqual(['Priya', 'Tom']);
  });

  it('leaves tickets unassigned when nobody is available', async () => {
    const alex = await createSignedInUser(ctx, 'agent', 'Alex');
    await as(ctx, admin).put('/api/settings/assignment', { autoAssign: true });
    await as(ctx, alex).patch('/api/auth/me', { available: false });
    expect(await assignees(1)).toEqual([null]);
  });

  it('records the automatic assignment in the timeline', async () => {
    await createSignedInUser(ctx, 'agent', 'Alex');
    await as(ctx, admin).put('/api/settings/assignment', { autoAssign: true });
    const ticket = await openTicket(ctx, customer);
    const events = (await as(ctx, admin).get(`/api/tickets/${ticket.id}/events`)).json().items;
    expect(events[1]).toMatchObject({ type: 'assigned', actor: null, data: { auto: true } });
  });

  it('only lets admins change the setting', async () => {
    const alex = await createSignedInUser(ctx, 'agent', 'Alex');
    expect(
      (await as(ctx, alex).put('/api/settings/assignment', { autoAssign: true })).statusCode,
    ).toBe(403);
    expect((await as(ctx, alex).get('/api/settings/assignment')).json()).toEqual({
      autoAssign: false,
    });
  });
});
