import { describe, expect, it } from 'vitest';
import { statusOptions } from './status';

describe('statusOptions', () => {
  it('starts with the current status followed by allowed moves', () => {
    expect(statusOptions('pending')).toEqual(['pending', 'open', 'on_hold', 'solved']);
  });

  it('offers nothing but itself for closed tickets', () => {
    expect(statusOptions('closed')).toEqual(['closed']);
  });
});
