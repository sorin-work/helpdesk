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

describe('creating tickets', () => {
  it('opens a new ticket with the first message from the customer', async () => {
    const ticket = await openTicket(ctx, customer, { priority: 'high' });
    expect(ticket).toMatchObject({
      id: 1001,
      subject: 'Printer is on fire',
      status: 'new',
      priority: 'high',
      requester: { name: 'Casey Morgan' },
      assignee: null,
    });
    expect(ticket.messages).toEqual([
      expect.objectContaining({
        body: 'It started smoking after the last update.',
        internal: false,
        author: expect.objectContaining({ name: 'Casey Morgan', role: 'customer' }),
      }),
    ]);
  });

  it('sets SLA targets from the priority', async () => {
    // Created Wed 10:00 UTC, high: 4 business hours to respond, 2 days to resolve.
    const ticket = await openTicket(ctx, customer, { priority: 'high' });
    expect(ticket.sla).toEqual({
      firstResponse: { state: 'on_track', dueAt: '2026-03-04T14:00:00.000Z' },
      resolution: { state: 'on_track', dueAt: '2026-03-06T10:00:00.000Z' },
    });
  });

  it('does not let customers pick urgent', async () => {
    const ticket = await openTicket(ctx, customer, { priority: 'urgent' });
    expect(ticket.priority).toBe('high');
  });
});

describe('updating tickets', () => {
  it('changes status, priority and assignee and records events', async () => {
    const ticket = await openTicket(ctx, customer);
    const res = await as(ctx, agent).patch(`/api/tickets/${ticket.id}`, {
      status: 'open',
      priority: 'urgent',
      assigneeId: agent.id,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: 'open',
      priority: 'urgent',
      assignee: { id: agent.id, name: 'Alex Rivera' },
    });

    const events = (await as(ctx, agent).get(`/api/tickets/${ticket.id}/events`)).json().items;
    expect(events.map((e: { type: string }) => e.type)).toEqual([
      'created',
      'priority_changed',
      'status_changed',
      'assigned',
    ]);
    expect(events[3]).toMatchObject({
      actor: { name: 'Alex Rivera' },
      data: { from: null, to: { id: agent.id, name: 'Alex Rivera' } },
    });
  });

  it('recomputes SLA targets when the priority changes', async () => {
    const ticket = await openTicket(ctx, customer, { priority: 'low' });
    const res = await as(ctx, agent).patch(`/api/tickets/${ticket.id}`, { priority: 'urgent' });
    // Urgent runs 24/7: one hour to respond.
    expect(res.json().sla.firstResponse.dueAt).toBe('2026-03-04T11:00:00.000Z');
  });

  it('refuses transitions that are not allowed', async () => {
    const ticket = await openTicket(ctx, customer);
    const res = await as(ctx, agent).patch(`/api/tickets/${ticket.id}`, { status: 'closed' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toBe('A new ticket cannot be moved to closed');
  });

  it('only assigns to active staff', async () => {
    const ticket = await openTicket(ctx, customer);
    const res = await as(ctx, agent).patch(`/api/tickets/${ticket.id}`, {
      assigneeId: customer.id,
    });
    expect(res.statusCode).toBe(400);
  });
});
