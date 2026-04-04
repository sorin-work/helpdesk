import type { Ticket, TicketStatus } from '../../db/schema/index.js';
import { businessMinutesBetween, type BusinessSchedule } from '../../lib/business-hours.js';
import { computeDueDates, scheduleFor, type SlaTarget } from '../../lib/sla.js';

type SlaPatch = Partial<
  Pick<
    Ticket,
    | 'status'
    | 'firstResponseDueAt'
    | 'resolutionDueAt'
    | 'firstRespondedAt'
    | 'firstResponseMinutes'
    | 'resolutionMinutes'
    | 'solvedAt'
    | 'closedAt'
  >
>;

type SlaTicket = Pick<Ticket, 'status' | 'createdAt'>;

/** Field changes that go with a status change. */
export function statusChangeFields(
  ticket: SlaTicket,
  to: TicketStatus,
  now: Date,
  target: SlaTarget,
  schedule: BusinessSchedule,
): SlaPatch {
  const clock = scheduleFor(target, schedule);
  const patch: SlaPatch = { status: to };
  if (to === 'solved') {
    patch.solvedAt = now;
    patch.resolutionMinutes = businessMinutesBetween(ticket.createdAt, now, clock);
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

/** Fields set by the first public reply from the team. */
export function firstResponseFields(
  ticket: Pick<Ticket, 'createdAt'>,
  now: Date,
  target: SlaTarget,
  schedule: BusinessSchedule,
): SlaPatch {
  return {
    firstRespondedAt: now,
    firstResponseMinutes: businessMinutesBetween(
      ticket.createdAt,
      now,
      scheduleFor(target, schedule),
    ),
  };
}
