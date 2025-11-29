import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    await app.db.execute(sql`select 1`);
    return { status: 'ok', database: 'ok' };
  });
}
