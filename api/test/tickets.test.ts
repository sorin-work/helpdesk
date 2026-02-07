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
let otherCustomer: TestUser;
let agent: TestUser;
let admin: TestUser;

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());
beforeEach(async () => {
  await ctx.reset();
  customer = await createSignedInUser(ctx, 'customer', 'Casey Morgan');
  otherCustomer = await createSignedInUser(ctx, 'customer', 'Jordan Lee');
  agent = await createSignedInUser(ctx, 'agent', 'Alex Rivera');
  admin = await createSignedInUser(ctx, 'admin', 'Dana Admin');
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

  it('validates subject and body', async () => {
    const res = await as(ctx, customer).post('/api/tickets', { subject: 'x', body: '   ' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details.map((d: { path: string }) => d.path)).toEqual([
      'subject',
      'body',
    ]);
  });

  it('requires a session', async () => {
    const res = await as(ctx, null).post('/api/tickets', { subject: 'Hello', body: 'World' });
    expect(res.statusCode).toBe(401);
  });
});

describe('access', () => {
  it('only shows customers their own tickets', async () => {
    const mine = await openTicket(ctx, customer);
    await openTicket(ctx, otherCustomer, { subject: 'Someone else' });

    const list = (await as(ctx, customer).get('/api/tickets')).json();
    expect(list.total).toBe(1);
    expect(list.items.map((t: { id: number }) => t.id)).toEqual([mine.id]);
  });

  it('hides other customers tickets behind a 404', async () => {
    const theirs = await openTicket(ctx, otherCustomer);
    const res = await as(ctx, customer).get(`/api/tickets/${theirs.id}`);
    expect(res.statusCode).toBe(404);
  });

  it('lets agents see every ticket', async () => {
    await openTicket(ctx, customer);
    await openTicket(ctx, otherCustomer);
    expect((await as(ctx, agent).get('/api/tickets?view=all')).json().total).toBe(2);
  });

  it('keeps view counts and events away from customers', async () => {
    const ticket = await openTicket(ctx, customer);
    expect((await as(ctx, customer).get('/api/tickets/counts')).statusCode).toBe(403);
    expect((await as(ctx, customer).get(`/api/tickets/${ticket.id}/events`)).statusCode).toBe(403);
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

  it('does not change closed tickets', async () => {
    const ticket = await openTicket(ctx, customer);
    await as(ctx, agent).patch(`/api/tickets/${ticket.id}`, { status: 'solved' });
    await as(ctx, agent).patch(`/api/tickets/${ticket.id}`, { status: 'closed' });
    const res = await as(ctx, agent).patch(`/api/tickets/${ticket.id}`, { priority: 'high' });
    expect(res.statusCode).toBe(409);
  });

  it('only assigns to active staff', async () => {
    const ticket = await openTicket(ctx, customer);
    const res = await as(ctx, agent).patch(`/api/tickets/${ticket.id}`, {
      assigneeId: customer.id,
    });
    expect(res.statusCode).toBe(400);
  });

  it('unassigns with null', async () => {
    const ticket = await openTicket(ctx, customer);
    await as(ctx, agent).patch(`/api/tickets/${ticket.id}`, { assigneeId: agent.id });
    const res = await as(ctx, agent).patch(`/api/tickets/${ticket.id}`, { assigneeId: null });
    expect(res.json().assignee).toBeNull();
  });

  it('replaces tags, normalizing names', async () => {
    const ticket = await openTicket(ctx, customer);
    await as(ctx, agent).patch(`/api/tickets/${ticket.id}`, { tags: ['Billing', 'refund'] });
    const res = await as(ctx, agent).patch(`/api/tickets/${ticket.id}`, {
      tags: ['billing', 'VIP Customer'],
    });
    expect(res.json().tags).toEqual(['billing', 'vip-customer']);

    const events = (await as(ctx, agent).get(`/api/tickets/${ticket.id}/events`)).json().items;
    expect(events.at(-1)).toMatchObject({
      type: 'tags_changed',
      data: { added: ['vip-customer'], removed: ['refund'] },
    });

    const tags = (await as(ctx, agent).get('/api/tags')).json().items;
    expect(tags).toEqual([
      { name: 'billing', tickets: 1, open: 1 },
      { name: 'vip-customer', tickets: 1, open: 1 },
    ]);
  });

  it('returns 404 for unknown tickets', async () => {
    expect((await as(ctx, agent).patch('/api/tickets/9999', { status: 'open' })).statusCode).toBe(
      404,
    );
    expect((await as(ctx, agent).get('/api/tickets/abc')).statusCode).toBe(400);
  });
});

describe('views', () => {
  async function seedQueue() {
    const a = await openTicket(ctx, customer, { subject: 'Unassigned one' });
    const b = await openTicket(ctx, customer, { subject: 'Assigned to me' });
    const c = await openTicket(ctx, otherCustomer, { subject: 'Assigned to admin' });
    const d = await openTicket(ctx, otherCustomer, { subject: 'Already solved' });
    await as(ctx, agent).patch(`/api/tickets/${b.id}`, { assigneeId: agent.id });
    await as(ctx, agent).patch(`/api/tickets/${c.id}`, { assigneeId: admin.id });
    await as(ctx, agent).patch(`/api/tickets/${d.id}`, { status: 'solved', assigneeId: agent.id });
    return { a, b, c, d };
  }

  const subjects = (res: { json(): { items: { subject: string }[] } }) =>
    res
      .json()
      .items.map((t) => t.subject)
      .sort();

  it('filters by view', async () => {
    await seedQueue();
    const view = (name: string) => as(ctx, agent).get(`/api/tickets?view=${name}`);
    expect(subjects(await view('unassigned'))).toEqual(['Unassigned one']);
    expect(subjects(await view('mine'))).toEqual(['Assigned to me']);
    expect(subjects(await view('open'))).toEqual([
      'Assigned to admin',
      'Assigned to me',
      'Unassigned one',
    ]);
    expect(subjects(await view('solved'))).toEqual(['Already solved']);
    expect((await view('all')).json().total).toBe(4);
  });

  it('counts tickets per view', async () => {
    await seedQueue();
    const counts = (await as(ctx, agent).get('/api/tickets/counts')).json();
    expect(counts).toEqual({ unassigned: 1, mine: 1, open: 3, overdue: 0 });
  });

  it('lists overdue tickets once a target passes', async () => {
    await openTicket(ctx, customer, { subject: 'Slow one', priority: 'normal' });
    await openTicket(ctx, customer, { subject: 'Fresh one', priority: 'low' });
    // Normal: first reply due within 8 business hours -> Thu 10:00.
    ctx.setNow('2026-03-05T10:30:00Z');
    const res = await as(ctx, agent).get('/api/tickets?view=overdue');
    expect(subjects(res)).toEqual(['Slow one']);
    expect(res.json().items[0].sla.firstResponse.state).toBe('breached');
  });

  it('filters by status, priority, assignee and tag', async () => {
    const { a, b } = await seedQueue();
    await as(ctx, agent).patch(`/api/tickets/${a.id}`, { priority: 'high', tags: ['billing'] });

    expect(subjects(await as(ctx, agent).get('/api/tickets?status=solved'))).toEqual([
      'Already solved',
    ]);
    expect(subjects(await as(ctx, agent).get('/api/tickets?priority=high'))).toEqual([
      'Unassigned one',
    ]);
    expect(subjects(await as(ctx, agent).get('/api/tickets?tag=billing'))).toEqual([
      'Unassigned one',
    ]);
    expect(
      subjects(await as(ctx, agent).get(`/api/tickets?assignee=${agent.id}&status=new`)),
    ).toEqual(['Assigned to me']);
    expect(subjects(await as(ctx, agent).get('/api/tickets?view=all&assignee=none'))).toEqual([
      'Unassigned one',
    ]);
    expect(b.id).toBeGreaterThan(a.id);
  });

  it('rejects unknown filters', async () => {
    expect((await as(ctx, agent).get('/api/tickets?view=everything')).statusCode).toBe(400);
    expect((await as(ctx, agent).get('/api/tickets?status=open,bogus')).statusCode).toBe(400);
  });

  it('sorts and paginates', async () => {
    for (const subject of ['First', 'Second', 'Third']) {
      await openTicket(ctx, customer, { subject });
      ctx.setNow(new Date(ctx.app.now().getTime() + 60_000));
    }
    const page1 = (await as(ctx, agent).get('/api/tickets?sort=oldest&pageSize=2')).json();
    expect(page1.items.map((t: { subject: string }) => t.subject)).toEqual(['First', 'Second']);
    expect(page1.total).toBe(3);
    const page2 = (await as(ctx, agent).get('/api/tickets?sort=oldest&pageSize=2&page=2')).json();
    expect(page2.items.map((t: { subject: string }) => t.subject)).toEqual(['Third']);
  });

  it('sorts by the next deadline', async () => {
    await openTicket(ctx, customer, { subject: 'Low', priority: 'low' });
    await openTicket(ctx, customer, { subject: 'High', priority: 'high' });
    await openTicket(ctx, customer, { subject: 'Normal', priority: 'normal' });
    const items = (await as(ctx, agent).get('/api/tickets?sort=due')).json().items;
    expect(items.map((t: { subject: string }) => t.subject)).toEqual(['High', 'Normal', 'Low']);
  });
});
