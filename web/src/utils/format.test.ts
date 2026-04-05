import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatFileSize,
  formatPercent,
  formatRelative,
  initials,
  isoDate,
} from './format';

describe('formatDuration', () => {
  it.each([
    [0, '0m'],
    [45, '45m'],
    [60, '1h'],
    [200, '3h 20m'],
    [1440, '1d'],
    [3120, '2d 4h'],
  ])('%i minutes -> %s', (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text);
  });

  it('shows a dash for missing values', () => {
    expect(formatDuration(null)).toBe('-');
    expect(formatDuration(undefined)).toBe('-');
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-03-04T10:00:00Z');

  it('describes the future and the past', () => {
    expect(formatRelative('2026-03-04T12:30:00Z', now)).toBe('in 2h 30m');
    expect(formatRelative('2026-03-02T10:00:00Z', now)).toBe('2d ago');
  });

  it('says just now for under a minute', () => {
    expect(formatRelative('2026-03-04T10:00:20Z', now)).toBe('just now');
  });
});

describe('small formatters', () => {
  it('formats file sizes', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(300 * 1024)).toBe('300 KB');
    expect(formatFileSize(5.5 * 1024 * 1024)).toBe('5.5 MB');
  });

  it('formats rates as percentages', () => {
    expect(formatPercent(0.876)).toBe('88%');
    expect(formatPercent(null)).toBe('-');
  });

  it('builds initials from up to two names', () => {
    expect(initials('Alex Rivera')).toBe('AR');
    expect(initials('maria del carmen')).toBe('MD');
    expect(initials('')).toBe('');
  });

  it('formats local dates for inputs', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
