import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig, type Config } from '../src/config.js';
import type { Db } from '../src/db/client.js';
import type { Role } from '../src/db/schema/index.js';
import { createUser } from '../src/modules/users/service.js';
import { createTestDatabase, resetDatabase } from './db.js';

export interface TestContext {
  app: FastifyInstance;
  db: Db;
  config: Config;
  reset(): Promise<void>;
  close(): Promise<void>;
}

export async function createTestContext(overrides: Partial<Config> = {}): Promise<TestContext> {
  const database = await createTestDatabase();
  const config: Config = {
    ...loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: 'pglite://memory',
      JWT_SECRET: 'test-secret-that-is-long-enough',
      BCRYPT_ROUNDS: '4',
      LOG_LEVEL: 'silent',
    }),
    ...overrides,
  };
  const app = await buildApp({ config, db: database.db });
  await app.ready();

  return {
    app,
    db: database.db,
    config,
    async reset() {
      await resetDatabase(database.db);
    },
    async close() {
      await app.close();
      await database.close();
    },
  };
}

export interface TestUser {
  id: number;
  email: string;
  cookie: string;
}

/** Creates a user directly and signs in through the API to get a session cookie. */
export async function createSignedInUser(
  ctx: TestContext,
  role: Role,
  name = `${role[0]!.toUpperCase()}${role.slice(1)} ${Math.floor(Math.random() * 1e6)}`,
): Promise<TestUser> {
  const email = `${name.toLowerCase().replace(/\W+/g, '.')}@example.test`;
  const user = await createUser(ctx.db, { email, name, password: 'password123', role }, 4);
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: 'password123' },
  });
  return { id: user.id, email, cookie: sessionCookie(res) };
}

export function sessionCookie(res: LightMyRequestResponse): string {
  const cookie = res.cookies.find((c) => c.name === 'helpdesk_session');
  if (!cookie) throw new Error(`No session cookie in response (status ${res.statusCode})`);
  return `helpdesk_session=${cookie.value}`;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Small wrapper around inject for JSON calls as a given user. */
export function as(ctx: TestContext, user: TestUser | null) {
  const call = (method: Method, url: string, payload?: unknown) =>
    ctx.app.inject({
      method,
      url,
      headers: user ? { cookie: user.cookie } : {},
      ...(payload !== undefined && { payload: payload as Record<string, unknown> }),
    });
  return {
    get: (url: string) => call('GET', url),
    post: (url: string, payload?: unknown) => call('POST', url, payload ?? {}),
    patch: (url: string, payload: unknown) => call('PATCH', url, payload),
    put: (url: string, payload: unknown) => call('PUT', url, payload),
    delete: (url: string) => call('DELETE', url),
  };
}
