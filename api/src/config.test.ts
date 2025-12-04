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
  });

  it('parses booleans and lists', () => {
    const config = loadConfig({
      ...required,
      COOKIE_SECURE: '1',
    });
    expect(config.cookieSecure).toBe(true);
  });

  it('explains what is wrong', () => {
    expect(() => loadConfig({ JWT_SECRET: 'short' })).toThrow(/DATABASE_URL[\s\S]*JWT_SECRET/);
  });
});
