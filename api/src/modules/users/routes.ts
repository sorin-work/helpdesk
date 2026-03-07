import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ROLES } from '../../db/schema/index.js';
import { currentUser } from '../../plugins/auth.js';
import { parse } from '../../lib/validation.js';
import { toUserDto } from './dto.js';
import { createUser, listStaff, listUsers, updateUser } from './service.js';

const listQuery = z.object({
  role: z.enum(ROLES).optional(),
  q: z.string().trim().max(100).optional(),
});

const createBody = z.object({
  email: z.email().max(254),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(200),
  role: z.enum(ROLES),
});

const updateBody = z
  .object({
    name: z.string().trim().min(1).max(100),
    role: z.enum(ROLES),
    active: z.boolean(),
  })
  .partial();

export async function userRoutes(app: FastifyInstance) {
  // Assignee pickers need the team list, so any staff member may read it.
  app.get('/agents', { preHandler: app.requireRole('agent', 'admin') }, async () => {
    const staff = await listStaff(app.db);
    return { items: staff.map(toUserDto) };
  });

  app.get('/users', { preHandler: app.requireRole('admin') }, async (request) => {
    const query = parse(listQuery, request.query);
    const items = await listUsers(app.db, query);
    return { items: items.map(toUserDto) };
  });

  app.post('/users', { preHandler: app.requireRole('admin') }, async (request, reply) => {
    const body = parse(createBody, request.body);
    const user = await createUser(app.db, body, app.config.bcryptRounds);
    return reply.status(201).send(toUserDto(user));
  });

  app.patch<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: app.requireRole('admin') },
    async (request) => {
      const id = parse(z.coerce.number().int().positive(), request.params.id);
      const body = parse(updateBody, request.body);
      const user = await updateUser(app.db, currentUser(request), id, body);
      return toUserDto(user);
    },
  );
}
