import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { badRequest } from '../../lib/errors.js';
import { parse } from '../../lib/validation.js';
import { reportOverview } from './service.js';

const DAY = 24 * 60 * 60_000;
const MAX_DAYS = 366;

const rangeQuery = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function reportRoutes(app: FastifyInstance) {
  app.get(
    '/reports/overview',
    { preHandler: app.requireRole('agent', 'admin') },
    async (request) => {
      const query = parse(rangeQuery, request.query);
      const now = app.now();
      const to = query.to ?? isoDay(now);
      const from = query.from ?? isoDay(new Date(Date.parse(to) - 29 * DAY));
      const days = (Date.parse(to) - Date.parse(from)) / DAY + 1;
      if (days < 1) throw badRequest('"from" must be on or before "to"');
      if (days > MAX_DAYS) throw badRequest(`Reports can cover at most ${MAX_DAYS} days`);
      return reportOverview(app.db, { from, to }, now);
    },
  );
}
