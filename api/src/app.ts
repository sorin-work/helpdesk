import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { Config } from './config.js';
import type { Db } from './db/client.js';
import { authRoutes } from './modules/auth/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { settingsRoutes } from './modules/settings/routes.js';
import { ticketRoutes } from './modules/tickets/routes.js';
import { registerAuth } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/errors.js';
import './types.js';

export interface AppOptions {
  config: Config;
  db: Db;
  now?: () => Date;
  logger?: FastifyServerOptions['logger'];
}

export function loggerOptions(config: Config): FastifyServerOptions['logger'] {
  return {
    level: config.logLevel,
    redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
    ...(config.env === 'development' && {
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
    }),
  };
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
  });

  app.decorate('config', options.config);
  app.decorate('db', options.db);
  app.decorate('now', options.now ?? (() => new Date()));

  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  registerErrorHandler(app);
  await registerAuth(app);

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes);
      await api.register(ticketRoutes);
      await api.register(settingsRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}
