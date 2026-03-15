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
let other: TestUser;
let agent: TestUser;

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());
beforeEach(async () => {
  await ctx.reset();
  customer = await createSignedInUser(ctx, 'customer', 'Casey Morgan');
  other = await createSignedInUser(ctx, 'customer', 'Jordan Lee');
  agent = await createSignedInUser(ctx, 'agent', 'Alex Rivera');

  const invoice = await openTicket(ctx, customer, {
    subject: 'Charged twice for March',
    body: 'Our card was charged two times for the same invoice.',
  });
  await as(ctx, agent).post(`/api/tickets/${invoice.id}/messages`, {
    body: 'Payment provider retried the refund <img src=x onerror=alert(1)> twice.',
    internal: true,
  });
  await openTicket(ctx, customer, {
    subject: 'Calendar sync stopped',
    body: 'Google calendar is empty.',
  });
  await openTicket(ctx, other, { subject: 'Refund please', body: 'I would like my money back.' });
});

const search = (user: TestUser, q: string) =>
  as(ctx, user).get(`/api/search?q=${encodeURIComponent(q)}`);

describe('GET /api/search', () => {
  it('finds tickets by subject and message text with stemming', async () => {
    const res = (await search(agent, 'charges')).json();
    expect(res.items.map((t: { subject: string }) => t.subject)).toEqual([
      'Charged twice for March',
    ]);
    expect(res.items[0].snippet).toContain('<mark>charged</mark>');
  });

  it('searches internal notes for agents only', async () => {
    const agentHits = (await search(agent, 'provider')).json().items;
    expect(agentHits).toHaveLength(1);
    expect(agentHits[0].snippet).toContain('&lt;img src=x');
    expect(agentHits[0].snippet).not.toContain('<img');
    expect((await search(customer, 'provider')).json().items).toEqual([]);
  });

  it('only searches a customer’s own tickets', async () => {
    const hits = (await search(customer, 'refund')).json().items;
    expect(hits).toEqual([]);
    expect(
      (await search(agent, 'refund')).json().items.map((t: { subject: string }) => t.subject),
    ).toEqual(['Refund please', 'Charged twice for March']);
  });
});
