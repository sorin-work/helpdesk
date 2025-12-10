import type { TicketStatus } from '../db/schema/index.js';

/**
 * Allowed status changes. `closed` is final: a customer writing in about a
 * closed ticket gets a new one.
 */
export const TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  new: ['open', 'pending', 'on_hold', 'solved'],
  open: ['pending', 'on_hold', 'solved'],
  pending: ['open', 'on_hold', 'solved'],
  on_hold: ['open', 'pending', 'solved'],
  solved: ['open', 'closed'],
  closed: [],
};

/** Statuses that still need work from the team. */
export const UNSOLVED_STATUSES: readonly TicketStatus[] = ['new', 'open', 'pending', 'on_hold'];

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isUnsolved(status: TicketStatus): boolean {
  return UNSOLVED_STATUSES.includes(status);
}
