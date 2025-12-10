import { describe, expect, it } from 'vitest';
import { TICKET_STATUSES } from '../db/schema/enums.js';
import { canTransition, isUnsolved, TRANSITIONS } from './status.js';

describe('ticket status transitions', () => {
  it('lets new tickets move anywhere except straight to closed', () => {
    expect(canTransition('new', 'open')).toBe(true);
    expect(canTransition('new', 'pending')).toBe(true);
    expect(canTransition('new', 'solved')).toBe(true);
    expect(canTransition('new', 'closed')).toBe(false);
  });

  it('never goes back to new', () => {
    for (const status of TICKET_STATUSES) {
      expect(canTransition(status, 'new')).toBe(false);
    }
  });

  it('reopens solved tickets but treats closed as final', () => {
    expect(canTransition('solved', 'open')).toBe(true);
    expect(canTransition('solved', 'closed')).toBe(true);
    expect(TRANSITIONS.closed).toEqual([]);
  });

  it('only closes tickets that were solved first', () => {
    const toClosed = TICKET_STATUSES.filter((s) => canTransition(s, 'closed'));
    expect(toClosed).toEqual(['solved']);
  });

  it('never allows a transition to the same status', () => {
    for (const status of TICKET_STATUSES) expect(canTransition(status, status)).toBe(false);
  });

  it('knows which statuses are unsolved', () => {
    expect(TICKET_STATUSES.filter(isUnsolved)).toEqual(['new', 'open', 'pending', 'on_hold']);
  });
});
