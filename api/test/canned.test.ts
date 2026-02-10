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
let agent: TestUser;
let customer: TestUser;

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());
beforeEach(async () => {
  await ctx.reset();
  agent = await createSignedInUser(ctx, 'agent', 'Alex Rivera');
  customer = await createSignedInUser(ctx, 'customer', 'Casey Morgan');
});

describe('canned responses', () => {
  it('can be created, listed, edited and deleted by agents', async () => {
    const created = await as(ctx, agent).post('/api/canned-responses', {
      title: 'Greeting',
      body: 'Hi {{customer.first_name}}!',
    });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();

    const edit = await as(ctx, agent).patch(`/api/canned-responses/${id}`, { body: 'Hello!' });
    expect(edit.statusCode).toBe(204);

    const list = (await as(ctx, agent).get('/api/canned-responses')).json();
    expect(list.items).toEqual([
      expect.objectContaining({
        title: 'Greeting',
        body: 'Hello!',
        createdBy: { id: agent.id, name: 'Alex Rivera' },
      }),
    ]);
    expect(list.placeholders.map((p: { key: string }) => p.key)).toContain('customer.first_name');

    expect((await as(ctx, agent).delete(`/api/canned-responses/${id}`)).statusCode).toBe(204);
    expect((await as(ctx, agent).get('/api/canned-responses')).json().items).toEqual([]);
  });

  it('renders placeholders for a ticket', async () => {
    const { id } = (
      await as(ctx, agent).post('/api/canned-responses', {
        title: 'Escalated',
        body: 'Hi {{customer.first_name}}, #{{ticket.id}} is with engineering. - {{agent.first_name}}',
      })
    ).json();
    const ticket = await openTicket(ctx, customer);
    const res = await as(ctx, agent).post(`/api/canned-responses/${id}/render`, {
      ticketId: ticket.id,
    });
    expect(res.json()).toEqual({ body: `Hi Casey, #${ticket.id} is with engineering. - Alex` });
  });
});
