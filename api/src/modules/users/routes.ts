import type { FastifyInstance } from 'fastify';
import { toUserDto } from './dto.js';
import { listStaff } from './service.js';

export async function userRoutes(app: FastifyInstance) {
  // Assignee pickers need the team list, so any staff member may read it.
  app.get('/agents', { preHandler: app.requireRole('agent', 'admin') }, async () => {
    const staff = await listStaff(app.db);
    return { items: staff.map(toUserDto) };
  });
}
