import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PLACEHOLDERS } from '../../lib/placeholders.js';
import { parse } from '../../lib/validation.js';
import { currentUser } from '../../plugins/auth.js';
import {
  createCannedResponse,
  deleteCannedResponse,
  listCannedResponses,
  renderCannedResponse,
  updateCannedResponse,
} from './service.js';

const id = z.coerce.number().int().positive();

const cannedBody = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100),
  body: z.string().trim().min(1, 'Text is required').max(10_000),
});

const renderBody = z.object({ ticketId: z.number().int().positive() });

export async function cannedRoutes(app: FastifyInstance) {
  const staffOnly = { preHandler: app.requireRole('agent', 'admin') };

  app.get('/canned-responses', staffOnly, async () => {
    return { items: await listCannedResponses(app.db), placeholders: PLACEHOLDERS };
  });

  app.post('/canned-responses', staffOnly, async (request, reply) => {
    const input = parse(cannedBody, request.body);
    const created = await createCannedResponse(app.db, currentUser(request), input);
    return reply.status(201).send(created);
  });

  app.patch<{ Params: { id: string } }>(
    '/canned-responses/:id',
    staffOnly,
    async (request, reply) => {
      const input = parse(cannedBody.partial(), request.body);
      await updateCannedResponse(app.db, parse(id, request.params.id), input);
      return reply.status(204).send();
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/canned-responses/:id',
    staffOnly,
    async (request, reply) => {
      await deleteCannedResponse(app.db, parse(id, request.params.id));
      return reply.status(204).send();
    },
  );

  app.post<{ Params: { id: string } }>(
    '/canned-responses/:id/render',
    staffOnly,
    async (request) => {
      const { ticketId } = parse(renderBody, request.body);
      const body = await renderCannedResponse(
        app.db,
        currentUser(request),
        parse(id, request.params.id),
        ticketId,
      );
      return { body };
    },
  );
}
