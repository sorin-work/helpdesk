import { eq } from 'drizzle-orm';
import type { DbOrTx } from '../../db/client.js';
import { tickets, type Ticket, type User } from '../../db/schema/index.js';
import { notFound } from '../../lib/errors.js';
import { isStaff } from '../../plugins/auth.js';

/**
 * Loads a ticket the viewer is allowed to see. Customers only see their own;
 * anything else is a 404 so ticket numbers do not leak.
 */
export async function loadTicketFor(db: DbOrTx, viewer: User, id: number): Promise<Ticket> {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
  if (!ticket) throw notFound('Ticket');
  if (!isStaff(viewer) && ticket.requesterId !== viewer.id) throw notFound('Ticket');
  return ticket;
}
