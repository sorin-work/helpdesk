import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../../db/schema/index.js';
import { parse } from '../../lib/validation.js';
import { currentUser } from '../../plugins/auth.js';
import { createTicket, getTicketDetail, listTickets, updateTicket } from './service.js';

const ticketId = z.coerce.number().int().positive();

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const body = z.string().trim().min(1, 'Message cannot be empty').max(20_000);

const createBody = z.object({
  subject: z.string().trim().min(3, 'Subject is too short').max(200),
  body,
  priority: z.enum(TICKET_PRIORITIES).default('normal'),
});

const updateBody = z
  .object({
    status: z.enum(TICKET_STATUSES),
    priority: z.enum(TICKET_PRIORITIES),
    assigneeId: z.number().int().positive().nullable(),
  })
  .partial();

export async function ticketRoutes(app: FastifyInstance) {
  app.get('/tickets', { preHandler: app.authenticate }, async (request) => {
    const query = parse(listQuery, request.query);
    return listTickets(app.db, currentUser(request), query, app.now());
  });

  app.post('/tickets', { preHandler: app.authenticate }, async (request, reply) => {
    const user = currentUser(request);
    const input = parse(createBody, request.body);
    const ticket = await createTicket(app.db, user, input, app.now());
    return reply.status(201).send(await getTicketDetail(app.db, user, ticket.id, app.now()));
  });

  app.get<{ Params: { id: string } }>(
    '/tickets/:id',
    { preHandler: app.authenticate },
    async (request) => {
      const id = parse(ticketId, request.params.id);
      return getTicketDetail(app.db, currentUser(request), id, app.now());
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/tickets/:id',
    { preHandler: app.requireRole('agent', 'admin') },
    async (request) => {
      const user = currentUser(request);
      const id = parse(ticketId, request.params.id);
      const input = parse(updateBody, request.body);
      await updateTicket(app.db, user, id, input, app.now());
      return getTicketDetail(app.db, user, id, app.now());
    },
  );
}
