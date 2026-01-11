import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockFetch } from '../test/fetch';
import { useAuthStore } from './auth';

const agent = { id: 2, email: 'agent@example.com', name: 'Alex', role: 'agent' };

beforeEach(() => setActivePinia(createPinia()));

describe('auth store', () => {
  it('loads the current session only once', async () => {
    const fetch = mockFetch({ 'GET /api/auth/me': { body: agent } });
    const auth = useAuthStore();
    await Promise.all([auth.load(), auth.load()]);
    await auth.load();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(auth.user?.name).toBe('Alex');
    expect(auth.isStaff).toBe(true);
    expect(auth.homePath).toBe('/queue/mine');
  });

  it('treats a 401 as signed out', async () => {
    mockFetch({ 'GET /api/auth/me': { status: 401, body: { error: { code: 'unauthorized' } } } });
    const auth = useAuthStore();
    await auth.load();
    expect(auth.loaded).toBe(true);
    expect(auth.user).toBeNull();
  });

  it('signs in and out', async () => {
    mockFetch({
      'POST /api/auth/login': { body: { ...agent, role: 'customer' } },
      'POST /api/auth/logout': { status: 204 },
    });
    const auth = useAuthStore();
    await auth.login('agent@example.com', 'pw');
    expect(auth.homePath).toBe('/portal');
    await auth.logout();
    expect(auth.user).toBeNull();
  });
});
