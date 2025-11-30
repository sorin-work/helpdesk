import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { users, type Role, type User } from '../db/schema/index.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import type { AuthHook } from '../types.js';

export const SESSION_COOKIE = 'helpdesk_session';

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(cookie);
  await app.register(jwt, {
    secret: app.config.jwtSecret,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
    sign: { expiresIn: `${app.config.sessionDays}d` },
  });

  app.decorateRequest('currentUser', null);

  const authenticate: AuthHook = async (request) => {
    let payload: { sub: number };
    try {
      payload = await request.jwtVerify({ onlyCookie: true });
    } catch {
      throw unauthorized();
    }
    // Look the user up on every request so deactivation and role changes apply at once.
    const [user] = await app.db.select().from(users).where(eq(users.id, payload.sub));
    if (!user || !user.active) throw unauthorized();
    request.currentUser = user;
  };

  app.decorate('authenticate', authenticate);
  app.decorate('requireRole', (...roles: Role[]): AuthHook => {
    return async (request) => {
      await authenticate(request);
      if (!roles.includes(request.currentUser!.role)) throw forbidden();
    };
  });
}

export async function startSession(app: FastifyInstance, reply: FastifyReply, user: User) {
  const token = await reply.jwtSign({ sub: user.id, role: user.role });
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: app.config.cookieSecure,
    maxAge: app.config.sessionDays * 24 * 60 * 60,
  });
}

export function endSession(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

/** The signed-in user; only valid behind `authenticate` or `requireRole`. */
export function currentUser(request: { currentUser: User | null }): User {
  if (!request.currentUser) throw unauthorized();
  return request.currentUser;
}

export function isStaff(user: Pick<User, 'role'>): boolean {
  return user.role === 'agent' || user.role === 'admin';
}
