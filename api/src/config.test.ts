import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const required = {
  DATABASE_URL: 'postgres://localhost/helpdesk',
  JWT_SECRET: 'a-secret-that-is-long-enough',
};

describe('loadConfig', () => {
  it('applies defaults', () => {
    const config = loadConfig(required);
    expect(config.port).toBe(4410);
    expect(config.maxUploadBytes).toBe(10 * 1024 * 1024);
    expect(config.allowedUploadTypes).toContain('application/pdf');
  });

  it('parses booleans and lists', () => {
    const config = loadConfig({
      ...required,
      COOKIE_SECURE: '1',
      ALLOWED_UPLOAD_TYPES: 'image/png, text/plain ,',
      MAX_UPLOAD_MB: '2.5',
    });
    expect(config.cookieSecure).toBe(true);
    expect(config.allowedUploadTypes).toEqual(['image/png', 'text/plain']);
    expect(config.maxUploadBytes).toBe(2_621_440);
  });

  it('explains what is wrong', () => {
    expect(() => loadConfig({ JWT_SECRET: 'short' })).toThrow(/DATABASE_URL[\s\S]*JWT_SECRET/);
  });
});
