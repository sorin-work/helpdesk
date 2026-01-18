import { describe, expect, it } from 'vitest';
import type { SlaState } from '../api/types';
import { worstClock } from './sla';

const sla = (first: SlaState, resolution: SlaState) => ({
  firstResponse: { state: first, dueAt: '2026-03-04T11:00:00Z' },
  resolution: { state: resolution, dueAt: '2026-03-05T10:00:00Z' },
});

describe('worstClock', () => {
  it('shows the first response while it is pending', () => {
    expect(worstClock(sla('on_track', 'on_track')).kind).toBe('firstResponse');
  });

  it('switches to resolution once the first response is met', () => {
    expect(worstClock(sla('met', 'on_track')).kind).toBe('resolution');
  });

  it('surfaces a resolution breach over an on-track first response', () => {
    expect(worstClock(sla('on_track', 'breached')).kind).toBe('resolution');
  });

  it('keeps showing a breached first response', () => {
    expect(worstClock(sla('breached', 'paused')).kind).toBe('firstResponse');
  });
});
