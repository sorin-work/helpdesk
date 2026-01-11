import { describe, expect, it } from 'vitest';
import type { User } from '../api/types';
import { checkAccess } from './guards';

const user = (role: User['role']): User => ({
  id: 1,
  email: 'x@example.com',
  name: 'X',
  role,
  active: true,
  available: true,
  createdAt: '2026-01-01T00:00:00Z',
});

describe('checkAccess', () => {
  it('sends anonymous visitors to the login page and remembers where they were going', () => {
    expect(checkAccess({}, null, '/tickets/1001')).toEqual({
      path: '/login',
      query: { redirect: '/tickets/1001' },
    });
  });

  it('lets anonymous visitors see guest pages', () => {
    expect(checkAccess({ guest: true }, null, '/login')).toBe(true);
  });

  it('moves signed-in users away from guest pages', () => {
    expect(checkAccess({ guest: true }, user('customer'), '/login')).toEqual({ path: '/portal' });
    expect(checkAccess({ guest: true }, user('agent'), '/signup')).toEqual({ path: '/queue/mine' });
  });

  it('keeps customers out of the agent workspace', () => {
    expect(checkAccess({ roles: ['agent', 'admin'] }, user('customer'), '/reports')).toEqual({
      path: '/portal',
    });
  });

  it('keeps agents out of admin pages', () => {
    expect(checkAccess({ roles: ['admin'] }, user('agent'), '/admin/settings')).toEqual({
      path: '/queue/mine',
    });
    expect(checkAccess({ roles: ['admin'] }, user('admin'), '/admin/settings')).toBe(true);
  });
});
