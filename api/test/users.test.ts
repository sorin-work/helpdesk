import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
  admin = await createSignedInUser(ctx, 'admin', 'Dana Admin');
  agent = await createSignedInUser(ctx, 'agent', 'Alex Rivera');
});

describe('user management', () => {
  it('lets admins invite agents who can then sign in', async () => {
    const res = await as(ctx, admin).post('/api/users', {
      email: 'priya@example.com',
      name: 'Priya Shah',
      password: 'temporary-pass',
      role: 'agent',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ role: 'agent', active: true, available: true });

    const login = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'priya@example.com', password: 'temporary-pass' },
    });
    expect(login.statusCode).toBe(200);
  });

  it('lists and searches users', async () => {
    await createSignedInUser(ctx, 'customer', 'Casey Morgan');
    const all = (await as(ctx, admin).get('/api/users')).json().items;
    expect(all.map((u: { name: string }) => u.name)).toEqual([
      'Alex Rivera',
      'Casey Morgan',
      'Dana Admin',
    ]);

    const customers = (await as(ctx, admin).get('/api/users?role=customer')).json().items;
    expect(customers).toHaveLength(1);
    const search = (await as(ctx, admin).get('/api/users?q=rive')).json().items;
    expect(search.map((u: { name: string }) => u.name)).toEqual(['Alex Rivera']);
  });

  it('changes roles and deactivates users', async () => {
    const promoted = await as(ctx, admin).patch(`/api/users/${agent.id}`, { role: 'admin' });
    expect(promoted.json().role).toBe('admin');

    const deactivated = await as(ctx, admin).patch(`/api/users/${agent.id}`, { active: false });
    expect(deactivated.json().active).toBe(false);
    const active = (await as(ctx, admin).get('/api/users')).json().items;
    expect(active.map((u: { name: string }) => u.name)).toEqual(['Dana Admin']);
    const everyone = (await as(ctx, admin).get('/api/users?includeInactive=true')).json().items;
    expect(everyone).toHaveLength(2);
  });

  it('stops admins from locking themselves out', async () => {
    expect(
      (await as(ctx, admin).patch(`/api/users/${admin.id}`, { role: 'agent' })).statusCode,
    ).toBe(400);
    expect(
      (await as(ctx, admin).patch(`/api/users/${admin.id}`, { active: false })).statusCode,
    ).toBe(400);
  });

  it('is admin only', async () => {
    expect((await as(ctx, agent).get('/api/users')).statusCode).toBe(403);
    expect(
      (
        await as(ctx, agent).post('/api/users', {
          email: 'x@example.com',
          name: 'X',
          password: 'password1',
          role: 'admin',
        })
      ).statusCode,
    ).toBe(403);
  });

  it('gives agents the team list for assignment', async () => {
    await createSignedInUser(ctx, 'customer', 'Casey Morgan');
    const res = (await as(ctx, agent).get('/api/agents')).json().items;
    expect(res.map((u: { name: string }) => u.name)).toEqual(['Alex Rivera', 'Dana Admin']);
  });

  it('returns 404 for unknown users', async () => {
    expect((await as(ctx, admin).patch('/api/users/999', { name: 'Ghost' })).statusCode).toBe(404);
  });
});
