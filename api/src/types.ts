import type { FastifyRequest } from 'fastify';
import type { Config } from './config.js';
import type { Db } from './db/client.js';
import type { Role, User } from './db/schema/index.js';

export type AuthHook = (request: FastifyRequest) => Promise<void>;

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    db: Db;
    authenticate: AuthHook;
    requireRole(...roles: Role[]): AuthHook;
  }

  interface FastifyRequest {
    currentUser: User | null;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: number; role: Role };
  }
}
