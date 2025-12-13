import type { Ticket, TicketStatus } from '../../db/schema/index.js';
import { type BusinessSchedule } from '../../lib/business-hours.js';
import { computeDueDates, type SlaTarget } from '../../lib/sla.js';

type SlaPatch = Partial<
  Pick<
    Ticket,
    | 'status'
    | 'firstResponseDueAt'
    | 'resolutionDueAt'
    | 'firstRespondedAt'
    | 'solvedAt'
    | 'closedAt'
  >
>;

type SlaTicket = Pick<Ticket, 'status' | 'createdAt'>;

/** Field changes that go with a status change. */
export function statusChangeFields(ticket: SlaTicket, to: TicketStatus, now: Date): SlaPatch {
  const patch: SlaPatch = { status: to };
  if (to === 'solved') {
    patch.solvedAt = now;
  }
  if (to === 'closed') patch.closedAt = now;
  return patch;
}

/** Due dates for a (possibly changed) priority. */
export function dueDateFields(
  ticket: Pick<Ticket, 'createdAt'>,
  target: SlaTarget,
  schedule: BusinessSchedule,
): SlaPatch {
  return computeDueDates(ticket.createdAt, target, schedule);
}
