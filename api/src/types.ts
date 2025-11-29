import type { Config } from './config.js';
import type { Db } from './db/client.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    db: Db;
  }
}
