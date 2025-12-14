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

const reply = (user: TestUser, id: number, payload: Record<string, unknown>) =>
  as(ctx, user).post(`/api/tickets/${id}/messages`, payload);

describe('public replies', () => {
  it('records the first response and moves new tickets to open', async () => {
    const ticket = await openTicket(ctx, customer, { priority: 'high' });
    ctx.setNow('2026-03-04T11:30:00Z');
    const res = await reply(agent, ticket.id, { body: 'Looking into it now.' });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe('open');
    expect(body.sla.firstResponse.state).toBe('met');
    expect(body.messages).toHaveLength(2);
  });

  it('marks the first response as breached when it comes late', async () => {
    const ticket = await openTicket(ctx, customer, { priority: 'high' });
    ctx.setNow('2026-03-04T15:00:00Z');
    const res = await reply(agent, ticket.id, { body: 'Sorry for the wait.' });
    expect(res.json().sla.firstResponse.state).toBe('breached');
  });

  it('can set the status in the same step', async () => {
    const ticket = await openTicket(ctx, customer);
    const res = await reply(agent, ticket.id, {
      body: 'Can you send a screenshot?',
      status: 'pending',
    });
    expect(res.json().status).toBe('pending');
  });

  it('reopens pending and solved tickets when the customer writes back', async () => {
    const ticket = await openTicket(ctx, customer);
    await reply(agent, ticket.id, { body: 'Can you send a screenshot?', status: 'pending' });
    const pending = await reply(customer, ticket.id, { body: 'Here you go.' });
    expect(pending.json().status).toBe('open');

    await reply(agent, ticket.id, { body: 'Fixed!', status: 'solved' });
    const solved = await reply(customer, ticket.id, { body: 'It broke again.' });
    expect(solved.json().status).toBe('open');
  });

  it('leaves new tickets new when the customer adds more detail', async () => {
    const ticket = await openTicket(ctx, customer);
    const res = await reply(customer, ticket.id, { body: 'One more thing.' });
    expect(res.json().status).toBe('new');
  });
});
