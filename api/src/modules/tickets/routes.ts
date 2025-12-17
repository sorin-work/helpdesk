import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../../db/schema/index.js';
import { parse } from '../../lib/validation.js';
import { currentUser, isStaff } from '../../plugins/auth.js';
import { loadTicketFor } from './access.js';
import { listEvents } from './events.js';
import { addMessage } from './messages.js';
import {
  createTicket,
  getTicketDetail,
  listTickets,
  updateTicket,
  viewCounts,
  VIEWS,
} from './service.js';

const ticketId = z.coerce.number().int().positive();

const listQuery = z.object({
  view: z.enum(VIEWS).optional(),
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

const messageBody = z.object({
  body,
  internal: z.boolean().default(false),
  status: z.enum(TICKET_STATUSES).optional(),
});

export async function ticketRoutes(app: FastifyInstance) {
  app.get('/tickets', { preHandler: app.authenticate }, async (request) => {
    const query = parse(listQuery, request.query);
    return listTickets(app.db, currentUser(request), query, app.now());
  });

  app.get('/tickets/counts', { preHandler: app.requireRole('agent', 'admin') }, async (request) => {
    return viewCounts(app.db, currentUser(request));
  });

  app.post('/tickets', { preHandler: app.authenticate }, async (request, reply) => {
    const user = currentUser(request);
    const input = parse(createBody, request.body);
    // Urgent is a judgement call for the team, not something customers pick.
    if (!isStaff(user) && input.priority === 'urgent') input.priority = 'high';
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

  app.post<{ Params: { id: string } }>(
    '/tickets/:id/messages',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const user = currentUser(request);
      const id = parse(ticketId, request.params.id);
      const input = parse(messageBody, request.body);
      await addMessage(app.db, user, id, input, app.now());
      return reply.status(201).send(await getTicketDetail(app.db, user, id, app.now()));
    },
  );

  app.get<{ Params: { id: string } }>(
    '/tickets/:id/events',
    { preHandler: app.requireRole('agent', 'admin') },
    async (request) => {
      const id = parse(ticketId, request.params.id);
      await loadTicketFor(app.db, currentUser(request), id);
      return { items: await listEvents(app.db, id) };
    },
  );
}
