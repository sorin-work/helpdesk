import { describe, expect, it } from 'vitest';
import { normalizeTag } from './service.js';

describe('normalizeTag', () => {
  it('lowercases and turns spaces into dashes', () => {
    expect(normalizeTag('  Billing Issue ')).toBe('billing-issue');
  });

  it('drops characters that are not letters, digits or dashes', () => {
    expect(normalizeTag('2FA / SMS!')).toBe('2fa-sms');
    expect(normalizeTag('feature_request')).toBe('feature-request');
  });

  it('returns null when nothing usable is left', () => {
    expect(normalizeTag('!!!')).toBeNull();
    expect(normalizeTag('   ')).toBeNull();
  });

  it('caps the length', () => {
    expect(normalizeTag('a'.repeat(60))).toHaveLength(40);
  });
});
