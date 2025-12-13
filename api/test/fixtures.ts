import { as, type TestContext, type TestUser } from './app.js';

export async function openTicket(
  ctx: TestContext,
  customer: TestUser,
  overrides: Record<string, unknown> = {},
) {
  const res = await as(ctx, customer).post('/api/tickets', {
    subject: 'Printer is on fire',
    body: 'It started smoking after the last update.',
    ...overrides,
  });
  if (res.statusCode !== 201) throw new Error(`openTicket failed: ${res.body}`);
  return res.json() as { id: number; [key: string]: unknown };
}
