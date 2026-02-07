import type { FastifyInstance } from 'fastify';
import { listTags } from './service.js';

export async function tagRoutes(app: FastifyInstance) {
  app.get('/tags', { preHandler: app.requireRole('agent', 'admin') }, async () => {
    return { items: await listTags(app.db) };
  });
}
