import { vi } from 'vitest';

export interface MockResponse {
  status?: number;
  body?: unknown;
}

/** Replaces fetch with a mock that answers by "METHOD /path" key. */
export function mockFetch(
  routes: Record<string, MockResponse | ((init: RequestInit) => MockResponse)>,
) {
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const key = `${init.method ?? 'GET'} ${url.pathname}`;
    const route = routes[key];
    if (!route) throw new Error(`Unexpected request: ${key}`);
    const res = typeof route === 'function' ? route(init) : route;
    const status = res.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(res.body ?? {}), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}
