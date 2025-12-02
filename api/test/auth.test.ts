import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, sessionCookie, type TestContext } from './app.js';

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
});

describe('session', () => {
  it('requires a session for /me', async () => {
    const res = await ctx.app.inject({ url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('unauthorized');
  });

  it('clears the cookie on logout', async () => {
    const res = await ctx.app.inject({ method: 'POST', url: '/api/auth/logout' });
    expect(res.statusCode).toBe(204);
    const cookie = res.cookies.find((c) => c.name === 'helpdesk_session');
    expect(cookie?.value).toBe('');
  });
});
