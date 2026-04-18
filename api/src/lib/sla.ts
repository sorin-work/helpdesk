import { addBusinessMinutes, type BusinessSchedule } from './business-hours.js';

export interface SlaTarget {
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHours: boolean;
}

export type SlaState = 'none' | 'on_track' | 'due_soon' | 'breached' | 'met' | 'paused';

export interface SlaClock {
  state: SlaState;
  dueAt: string | null;
}

export interface SlaSummary {
  firstResponse: SlaClock;
  resolution: SlaClock;
}

/** Warn this long before a target is due. */
export const DUE_SOON_MS = 60 * 60_000;

export function scheduleFor(
  target: SlaTarget,
  schedule: BusinessSchedule,
): BusinessSchedule | null {
  return target.businessHours ? schedule : null;
}

export function computeDueDates(
  createdAt: Date,
  target: SlaTarget,
  schedule: BusinessSchedule,
  pausedMinutes = 0,
): { firstResponseDueAt: Date; resolutionDueAt: Date } {
  const clock = scheduleFor(target, schedule);
  return {
    firstResponseDueAt: addBusinessMinutes(createdAt, target.firstResponseMinutes, clock),
    resolutionDueAt: addBusinessMinutes(createdAt, target.resolutionMinutes + pausedMinutes, clock),
  };
}

interface SlaFields {
  firstResponseDueAt: Date | null;
  resolutionDueAt: Date | null;
  firstRespondedAt: Date | null;
  solvedAt: Date | null;
  slaPausedAt: Date | null;
}

function pendingState(dueAt: Date, now: Date): SlaState {
  const left = dueAt.getTime() - now.getTime();
  if (left < 0) return 'breached';
  if (left <= DUE_SOON_MS) return 'due_soon';
  return 'on_track';
}

export function slaSummary(ticket: SlaFields, now: Date = new Date()): SlaSummary {
  return {
    firstResponse: firstResponseClock(ticket, now),
    resolution: resolutionClock(ticket, now),
  };
}

function firstResponseClock(ticket: SlaFields, now: Date): SlaClock {
  const due = ticket.firstResponseDueAt;
  if (!due) return { state: 'none', dueAt: null };
  const dueAt = due.toISOString();
  if (ticket.firstRespondedAt) {
    return { state: ticket.firstRespondedAt <= due ? 'met' : 'breached', dueAt };
  }
  // Solved without a public reply (e.g. a duplicate): nothing left to measure.
  if (ticket.solvedAt) return { state: ticket.solvedAt <= due ? 'met' : 'breached', dueAt };
  return { state: pendingState(due, now), dueAt };
}

function resolutionClock(ticket: SlaFields, now: Date): SlaClock {
  const due = ticket.resolutionDueAt;
  if (!due) return { state: 'none', dueAt: null };
  const dueAt = due.toISOString();
  if (ticket.solvedAt) return { state: ticket.solvedAt <= due ? 'met' : 'breached', dueAt };
  if (ticket.slaPausedAt) {
    return { state: ticket.slaPausedAt > due ? 'breached' : 'paused', dueAt };
  }
  return { state: pendingState(due, now), dueAt };
}
