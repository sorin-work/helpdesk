import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import {
  messages,
  tickets,
  type Message,
  type Ticket,
  type TicketStatus,
  type User,
} from '../../db/schema/index.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { canTransition } from '../../lib/status.js';
import { isStaff } from '../../plugins/auth.js';
import { recordEvent } from './events.js';
import { statusChangeFields } from './sla-fields.js';

export interface AddMessageInput {
  body: string;
  internal: boolean;
  /** Staff can set the status in the same step, e.g. "reply and set pending". */
  status?: TicketStatus;
}

/** Customer replies wake up tickets that were waiting on them or already solved. */
const REOPEN_ON_CUSTOMER_REPLY: readonly TicketStatus[] = ['pending', 'solved'];

function nextStatus(ticket: Ticket, author: User, input: AddMessageInput): TicketStatus {
  if (!isStaff(author)) {
    return REOPEN_ON_CUSTOMER_REPLY.includes(ticket.status) ? 'open' : ticket.status;
  }
  if (input.status) return input.status;
  // The first public reply takes a ticket out of "new".
  if (!input.internal && ticket.status === 'new') return 'open';
  return ticket.status;
}

export async function addMessage(
  db: Db,
  author: User,
  ticketId: number,
  input: AddMessageInput,
  now: Date,
): Promise<Message> {
  const staff = isStaff(author);
  if (!staff && input.internal) throw badRequest('Only agents can add internal notes');
  if (!staff && input.status) throw badRequest('Only agents can change the status');

  return db.transaction(async (tx) => {
    const [ticket] = await tx.select().from(tickets).where(eq(tickets.id, ticketId)).for('update');
    if (!ticket || (!staff && ticket.requesterId !== author.id)) throw notFound('Ticket');
    if (ticket.status === 'closed') {
      throw conflict('This ticket is closed. Please open a new ticket instead.');
    }

    const [message] = await tx
      .insert(messages)
      .values({
        ticketId,
        authorId: author.id,
        body: input.body,
        internal: input.internal,
        createdAt: now,
      })
      .returning();

    const patch: Partial<Ticket> = { updatedAt: now };
    if (!input.internal) patch.lastMessageAt = now;

    if (staff && !input.internal && !ticket.firstRespondedAt) {
      patch.firstRespondedAt = now;
    }

    // Replying publicly to an unassigned ticket takes it.
    if (staff && !input.internal && ticket.assigneeId === null) {
      patch.assigneeId = author.id;
      await recordEvent(
        tx,
        ticketId,
        author.id,
        'assigned',
        { from: null, to: { id: author.id, name: author.name } },
        now,
      );
    }

    const status = nextStatus(ticket, author, input);
    if (status !== ticket.status) {
      if (!canTransition(ticket.status, status)) {
        throw badRequest(`A ${ticket.status} ticket cannot be moved to ${status}`);
      }
      Object.assign(patch, statusChangeFields(ticket, status, now));
      await recordEvent(
        tx,
        ticketId,
        author.id,
        'status_changed',
        { from: ticket.status, to: status },
        now,
      );
    }

    await tx.update(tickets).set(patch).where(eq(tickets.id, ticketId));
    return message!;
  });
}
