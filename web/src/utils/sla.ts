import type { Sla, SlaClock, SlaState } from '../api/types';

const SEVERITY: Record<SlaState, number> = {
  breached: 5,
  due_soon: 4,
  on_track: 3,
  paused: 2,
  met: 1,
  none: 0,
};

export type ClockKind = 'firstResponse' | 'resolution';

/**
 * The clock worth showing in a list: whichever needs more attention, with
 * first response winning ties.
 */
export function worstClock(sla: Sla): { kind: ClockKind; clock: SlaClock } {
  if (SEVERITY[sla.resolution.state] > SEVERITY[sla.firstResponse.state]) {
    return { kind: 'resolution', clock: sla.resolution };
  }
  return { kind: 'firstResponse', clock: sla.firstResponse };
}

export const CLOCK_LABELS: Record<ClockKind, string> = {
  firstResponse: 'First response',
  resolution: 'Resolution',
};
