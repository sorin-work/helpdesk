import type { Ticket, TicketStatus } from '../../db/schema/index.js';
import {
  addBusinessMinutes,
  businessMinutesBetween,
  type BusinessSchedule,
} from '../../lib/business-hours.js';
import { computeDueDates, scheduleFor, type SlaTarget } from '../../lib/sla.js';
import { isPausedStatus } from '../../lib/status.js';

type SlaPatch = Partial<
  Pick<
    Ticket,
    | 'status'
    | 'firstResponseDueAt'
    | 'resolutionDueAt'
    | 'firstRespondedAt'
    | 'firstResponseMinutes'
    | 'resolutionMinutes'
    | 'slaPausedAt'
    | 'slaPausedMinutes'
    | 'solvedAt'
    | 'closedAt'
  >
>;

type SlaTicket = Pick<
  Ticket,
  'status' | 'createdAt' | 'firstRespondedAt' | 'slaPausedAt' | 'slaPausedMinutes'
>;

/**
 * Field changes that go with a status change: pausing and resuming the
 * resolution clock, and freezing durations when a ticket is solved.
 */
export function statusChangeFields(
  ticket: SlaTicket,
  to: TicketStatus,
  now: Date,
  target: SlaTarget,
  schedule: BusinessSchedule,
): SlaPatch {
  const clock = scheduleFor(target, schedule);
  const patch: SlaPatch = { status: to };
  let pausedMinutes = ticket.slaPausedMinutes;

  const wasPaused = ticket.slaPausedAt !== null;
  const willPause = isPausedStatus(to);
  if (wasPaused && !willPause) {
    pausedMinutes += businessMinutesBetween(ticket.slaPausedAt!, now, clock);
    patch.slaPausedAt = null;
    patch.slaPausedMinutes = pausedMinutes;
    patch.resolutionDueAt = addBusinessMinutes(
      ticket.createdAt,
      target.resolutionMinutes + pausedMinutes,
      clock,
    );
  } else if (!wasPaused && willPause) {
    patch.slaPausedAt = now;
  }

  if (to === 'solved') {
    patch.solvedAt = now;
    patch.resolutionMinutes = Math.max(
      0,
      businessMinutesBetween(ticket.createdAt, now, clock) - pausedMinutes,
    );
  } else if (ticket.status === 'solved' && to === 'open') {
    patch.solvedAt = null;
    patch.resolutionMinutes = null;
  }
  if (to === 'closed') patch.closedAt = now;
  return patch;
}

/** Due dates for a (possibly changed) priority, keeping time already paused. */
export function dueDateFields(
  ticket: Pick<Ticket, 'createdAt' | 'slaPausedMinutes'>,
  target: SlaTarget,
  schedule: BusinessSchedule,
): SlaPatch {
  return computeDueDates(ticket.createdAt, target, schedule, ticket.slaPausedMinutes);
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
