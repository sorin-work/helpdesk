import { describe, expect, it } from 'vitest';
import { mockFetch } from '../test/fetch';
import { api, ApiError, buildQuery } from './client';

describe('buildQuery', () => {
  it('skips empty values', () => {
    expect(buildQuery({ view: 'mine', tag: '', page: 2, q: undefined, x: null })).toBe(
      '?view=mine&page=2',
    );
    expect(buildQuery({})).toBe('');
  });
});

describe('api', () => {
  it('sends JSON and parses the response', async () => {
    const fetch = mockFetch({ 'POST /api/tickets': { status: 201, body: { id: 1001 } } });
    const res = await api.post<{ id: number }>('/tickets', { subject: 'Hi' });
    expect(res.id).toBe(1001);

    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('/api/tickets');
    expect(init?.body).toBe('{"subject":"Hi"}');
    expect((init?.headers as Record<string, string>)['content-type']).toBe('application/json');
    expect(init?.credentials).toBe('same-origin');
  });

  it('returns undefined for 204 responses', async () => {
    mockFetch({ 'DELETE /api/canned-responses/1': { status: 204 } });
    await expect(api.delete('/canned-responses/1')).resolves.toBeUndefined();
  });

  it('turns error bodies into ApiErrors with field messages', async () => {
    mockFetch({
      'POST /api/auth/signup': {
        status: 400,
        body: {
          error: {
            code: 'validation_error',
            message: 'Some fields are missing or invalid',
            details: [{ path: 'email', message: 'Invalid email address' }],
          },
        },
      },
    });
    const err = await api.post('/auth/signup', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).fieldErrors()).toEqual({ email: 'Invalid email address' });
  });

  it('reports network failures clearly', async () => {
    mockFetch({});
    const err = await api.get('/tickets').catch((e: unknown) => e);
    expect((err as ApiError).code).toBe('network_error');
  });

  it('uploads files as multipart form data', async () => {
    const fetch = mockFetch({ 'POST /api/attachments': { status: 201, body: { id: 'a' } } });
    await api.upload('/attachments', new File(['hi'], 'hi.txt', { type: 'text/plain' }));
    const init = fetch.mock.calls[0]![1]!;
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.headers as Record<string, string>)['content-type']).toBeUndefined();
  });
});
