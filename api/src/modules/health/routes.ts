import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  // Docker polls this every few seconds; keep it out of the info logs.
  app.get('/health', { logLevel: 'warn' }, async () => {
    await app.db.execute(sql`select 1`);
    return { status: 'ok', database: 'ok' };
  });
}
