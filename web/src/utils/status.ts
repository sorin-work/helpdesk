import type { TicketStatus } from '../api/types';

/** Mirrors the API's allowed transitions so the UI only offers valid moves. */
export const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ['open', 'pending', 'on_hold', 'solved'],
  open: ['pending', 'on_hold', 'solved'],
  pending: ['open', 'on_hold', 'solved'],
  on_hold: ['open', 'pending', 'solved'],
  solved: ['open', 'closed'],
  closed: [],
};

export function statusOptions(current: TicketStatus): TicketStatus[] {
  return [current, ...TRANSITIONS[current]];
}

export function isUnsolved(status: TicketStatus): boolean {
  return ['new', 'open', 'pending', 'on_hold'].includes(status);
}
