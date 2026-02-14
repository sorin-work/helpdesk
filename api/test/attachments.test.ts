import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  as,
  createSignedInUser,
  createTestContext,
  type TestContext,
  type TestUser,
} from './app.js';
import { openTicket } from './fixtures.js';

let ctx: TestContext;
let customer: TestUser;
let other: TestUser;
let agent: TestUser;

beforeAll(async () => {
  ctx = await createTestContext({ maxUploadBytes: 1024 });
});
afterAll(() => ctx.close());
beforeEach(async () => {
  await ctx.reset();
  customer = await createSignedInUser(ctx, 'customer', 'Casey Morgan');
  other = await createSignedInUser(ctx, 'customer', 'Jordan Lee');
  agent = await createSignedInUser(ctx, 'agent', 'Alex Rivera');
});

/** Builds a multipart body by hand; inject has no FormData support. */
function upload(user: TestUser, filename: string, contentType: string, content: string | Buffer) {
  const boundary = '----helpdesk-test-boundary';
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`,
    ),
    Buffer.isBuffer(content) ? content : Buffer.from(content),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return ctx.app.inject({
    method: 'POST',
    url: '/api/attachments',
    headers: { cookie: user.cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: body,
  });
}

describe('uploading', () => {
  it('stores the file and returns its metadata', async () => {
    const res = await upload(customer, 'screenshot.png', 'image/png', 'fake-png-bytes');
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      filename: 'screenshot.png',
      contentType: 'image/png',
      size: 14,
    });
  });

  it('rejects types that are not on the allow list', async () => {
    const res = await upload(customer, 'run.exe', 'application/x-msdownload', 'MZ');
    expect(res.statusCode).toBe(415);
    expect(res.json().error.code).toBe('unsupported_file_type');
  });

  it('rejects files over the size limit', async () => {
    const res = await upload(customer, 'big.txt', 'text/plain', Buffer.alloc(2048, 'a'));
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe('file_too_large');
  });
});

describe('attaching and downloading', () => {
  it('attaches uploads to a new ticket and serves them to people who can see it', async () => {
    const file = (await upload(customer, 'log.txt', 'text/plain', 'error at line 3')).json();
    const ticket = await openTicket(ctx, customer, { attachmentIds: [file.id] });
    expect((ticket.messages as { attachments: unknown[] }[])[0]!.attachments).toEqual([
      { id: file.id, filename: 'log.txt', contentType: 'text/plain', size: 15 },
    ]);

    const download = await as(ctx, agent).get(`/api/attachments/${file.id}`);
    expect(download.statusCode).toBe(200);
    expect(download.body).toBe('error at line 3');
    expect(download.headers['content-disposition']).toBe("attachment; filename*=UTF-8''log.txt");

    expect((await as(ctx, other).get(`/api/attachments/${file.id}`)).statusCode).toBe(404);
  });

  it('does not let anyone else use or see an unlinked upload', async () => {
    const file = (await upload(customer, 'log.txt', 'text/plain', 'secret')).json();
    expect((await as(ctx, agent).get(`/api/attachments/${file.id}`)).statusCode).toBe(404);
    expect((await as(ctx, customer).get(`/api/attachments/${file.id}`)).statusCode).toBe(200);

    const res = await as(ctx, other).post('/api/tickets', {
      subject: 'Stolen file',
      body: 'Look',
      attachmentIds: [file.id],
    });
    expect(res.statusCode).toBe(400);
  });

  it('hides attachments on internal notes from customers', async () => {
    const ticket = await openTicket(ctx, customer);
    const file = (await upload(agent, 'notes.txt', 'text/plain', 'internal')).json();
    await as(ctx, agent).post(`/api/tickets/${ticket.id}/messages`, {
      body: 'See attached',
      internal: true,
      attachmentIds: [file.id],
    });
    expect((await as(ctx, customer).get(`/api/attachments/${file.id}`)).statusCode).toBe(404);
    expect((await as(ctx, agent).get(`/api/attachments/${file.id}`)).statusCode).toBe(200);
  });
});
