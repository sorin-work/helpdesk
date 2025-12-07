import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TICKET_PRIORITIES } from '../../db/schema/index.js';
import { parse } from '../../lib/validation.js';
import {
  getPolicies,
  getSchedule,
  policySchema,
  savePolicies,
  saveSchedule,
  scheduleSchema,
} from '../sla/service.js';

const policiesBody = z.object(
  Object.fromEntries(TICKET_PRIORITIES.map((p) => [p, policySchema.optional()])) as Record<
    (typeof TICKET_PRIORITIES)[number],
    z.ZodOptional<typeof policySchema>
  >,
);

export async function settingsRoutes(app: FastifyInstance) {
  const staffOnly = { preHandler: app.requireRole('agent', 'admin') };
  const adminOnly = { preHandler: app.requireRole('admin') };

  app.get('/settings/business-hours', staffOnly, async () => getSchedule(app.db));

  app.put('/settings/business-hours', adminOnly, async (request) => {
    const schedule = parse(scheduleSchema, request.body);
    await saveSchedule(app.db, schedule);
    return schedule;
  });

  app.get('/settings/sla', staffOnly, async () => getPolicies(app.db));

  // New targets apply to tickets created from now on and to priority changes.
  app.put('/settings/sla', adminOnly, async (request) => {
    const policies = parse(policiesBody, request.body);
    await savePolicies(app.db, policies);
    return getPolicies(app.db);
  });
}
