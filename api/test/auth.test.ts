import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  as,
  createSignedInUser,
  createTestContext,
  sessionCookie,
  type TestContext,
} from './app.js';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());
beforeEach(() => ctx.reset());

const signup = (payload: Record<string, unknown>) =>
  ctx.app.inject({ method: 'POST', url: '/api/auth/signup', payload });

describe('POST /api/auth/signup', () => {
  it('creates a customer account and signs it in', async () => {
    const res = await signup({
      email: 'Casey@Example.com',
      name: 'Casey',
      password: 'long-enough',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      email: 'casey@example.com',
      name: 'Casey',
      role: 'customer',
    });
    expect(res.json()).not.toHaveProperty('passwordHash');

    const cookie = res.cookies.find((c) => c.name === 'helpdesk_session');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');

    const me = await ctx.app.inject({
      url: '/api/auth/me',
      headers: { cookie: sessionCookie(res) },
    });
    expect(me.json().email).toBe('casey@example.com');
  });

  it('ignores attempts to sign up as staff', async () => {
    const res = await signup({
      email: 'x@example.com',
      name: 'X',
      password: 'long-enough',
      role: 'admin',
    });
    expect(res.json().role).toBe('customer');
  });

  it('rejects duplicate emails regardless of case', async () => {
    await signup({ email: 'casey@example.com', name: 'Casey', password: 'long-enough' });
    const res = await signup({
      email: 'CASEY@example.com',
      name: 'Other',
      password: 'long-enough',
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('conflict');
  });

  it('validates the input', async () => {
    const res = await signup({ email: 'not-an-email', name: '', password: 'short' });
    expect(res.statusCode).toBe(400);
    const paths = res.json().error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['email', 'name', 'password']));
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await signup({ email: 'casey@example.com', name: 'Casey', password: 'long-enough' });
  });

  it('signs in with the right password', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: ' CASEY@example.com ', password: 'long-enough' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.cookies.some((c) => c.name === 'helpdesk_session')).toBe(true);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrong = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'casey@example.com', password: 'nope' },
    });
    const unknown = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@example.com', password: 'nope' },
    });
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json().error.message).toBe(unknown.json().error.message);
  });

  it('refuses deactivated users', async () => {
    const admin = await createSignedInUser(ctx, 'admin');
    const agent = await createSignedInUser(ctx, 'agent', 'Gone Agent');
    await as(ctx, admin).patch(`/api/users/${agent.id}`, { active: false });

    const login = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: agent.email, password: 'password123' },
    });
    expect(login.statusCode).toBe(401);
    // Existing sessions stop working straight away too.
    expect((await as(ctx, agent).get('/api/auth/me')).statusCode).toBe(401);
  });
});

describe('session', () => {
  it('requires a session for /me', async () => {
    const res = await ctx.app.inject({ url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('unauthorized');
  });

  it('rejects a tampered token', async () => {
    const res = await ctx.app.inject({
      url: '/api/auth/me',
      headers: { cookie: 'helpdesk_session=eyJhbGciOiJIUzI1NiJ9.e30.bad' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('clears the cookie on logout', async () => {
    const res = await ctx.app.inject({ method: 'POST', url: '/api/auth/logout' });
    expect(res.statusCode).toBe(204);
    const cookie = res.cookies.find((c) => c.name === 'helpdesk_session');
    expect(cookie?.value).toBe('');
  });
});

describe('profile', () => {
  it('updates the name', async () => {
    const user = await createSignedInUser(ctx, 'customer');
    const res = await as(ctx, user).patch('/api/auth/me', { name: 'New Name' });
    expect(res.json().name).toBe('New Name');
  });

  it('changes the password after checking the current one', async () => {
    const user = await createSignedInUser(ctx, 'customer');
    const wrong = await as(ctx, user).post('/api/auth/password', {
      currentPassword: 'wrong',
      newPassword: 'another-password',
    });
    expect(wrong.statusCode).toBe(400);

    const ok = await as(ctx, user).post('/api/auth/password', {
      currentPassword: 'password123',
      newPassword: 'another-password',
    });
    expect(ok.statusCode).toBe(204);
    const login = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: user.email, password: 'another-password' },
    });
    expect(login.statusCode).toBe(200);
  });
});
