import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { Config } from './config.js';
import { healthRoutes } from './modules/health/routes.js';

export interface AppOptions {
  config: Config;
  logger?: FastifyServerOptions['logger'];
}

export function loggerOptions(config: Config): FastifyServerOptions['logger'] {
  return {
    level: config.logLevel,
  };
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.decorate('config', options.config);

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}
