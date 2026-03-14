import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/validation.js';
import { currentUser } from '../../plugins/auth.js';
import { searchTickets } from './service.js';

const searchQuery = z.object({
  q: z.string().trim().min(1, 'Type something to search for').max(200),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

export async function searchRoutes(app: FastifyInstance) {
  app.get('/search', { preHandler: app.authenticate }, async (request) => {
    const { q, limit } = parse(searchQuery, request.query);
    return { items: await searchTickets(app.db, currentUser(request), q, limit) };
  });
}
