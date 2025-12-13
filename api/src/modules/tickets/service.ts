import { and, asc, count, desc, eq, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Db, DbOrTx } from '../../db/client.js';
import {
  messages,
  tickets,
  users,
  type Ticket,
  type TicketPriority,
  type User,
} from '../../db/schema/index.js';
import { notFound } from '../../lib/errors.js';
import { isStaff } from '../../plugins/auth.js';
import { getPolicy, getSchedule } from '../sla/service.js';
import { loadTicketFor } from './access.js';
import { toMessageDto, toTicketSummary, type TicketDetailDto } from './dto.js';
import { recordEvent } from './events.js';
import { dueDateFields } from './sla-fields.js';

const requester = alias(users, 'requester');
const assignee = alias(users, 'assignee');

const rowSelection = {
  ticket: tickets,
  requester: { id: requester.id, name: requester.name, email: requester.email },
  assignee: { id: assignee.id, name: assignee.name },
};

function ticketRows(db: DbOrTx) {
  return db
    .select(rowSelection)
    .from(tickets)
    .innerJoin(requester, eq(requester.id, tickets.requesterId))
    .leftJoin(assignee, eq(assignee.id, tickets.assigneeId));
}

// ---------------------------------------------------------------------------
// Views and listing

export interface ListTicketsInput {
  page: number;
  pageSize: number;
}

export async function listTickets(db: Db, viewer: User, input: ListTicketsInput, now: Date) {
  const conditions: (SQL | undefined)[] = [];
  if (!isStaff(viewer)) {
    conditions.push(eq(tickets.requesterId, viewer.id));
  }

  const where = and(...conditions);
  const [rows, [total]] = await Promise.all([
    ticketRows(db)
      .where(where)
      .orderBy(desc(tickets.updatedAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
    db.select({ value: count() }).from(tickets).where(where),
  ]);

  return {
    items: rows.map((row) => toTicketSummary(row, now)),
    total: total?.value ?? 0,
    page: input.page,
    pageSize: input.pageSize,
  };
}

// ---------------------------------------------------------------------------
// Single ticket

export async function getTicketDetail(
  db: Db,
  viewer: User,
  id: number,
  now: Date,
): Promise<TicketDetailDto> {
  await loadTicketFor(db, viewer, id);
  const [row] = await ticketRows(db).where(eq(tickets.id, id));
  if (!row) throw notFound('Ticket');
  const summary = toTicketSummary(row, now);

  const staff = isStaff(viewer);
  const messageRows = await db
    .select({ message: messages, author: { id: users.id, name: users.name, role: users.role } })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.authorId))
    .where(
      staff
        ? eq(messages.ticketId, id)
        : and(eq(messages.ticketId, id), eq(messages.internal, false)),
    )
    .orderBy(asc(messages.createdAt), asc(messages.id));

  return {
    ...summary,
    messages: messageRows.map((m) => toMessageDto(m.message, m.author)),
  };
}

// ---------------------------------------------------------------------------
// Creating

export interface CreateTicketInput {
  subject: string;
  body: string;
  priority: TicketPriority;
}

export async function createTicket(
  db: Db,
  actor: User,
  input: CreateTicketInput,
  now: Date,
): Promise<Ticket> {
  return db.transaction(async (tx) => {
    const [schedule, target] = await Promise.all([getSchedule(tx), getPolicy(tx, input.priority)]);
    const [ticket] = await tx
      .insert(tickets)
      .values({
        subject: input.subject,
        priority: input.priority,
        requesterId: actor.id,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
        ...dueDateFields({ createdAt: now }, target, schedule),
      })
      .returning();

    await tx
      .insert(messages)
      .values({ ticketId: ticket!.id, authorId: actor.id, body: input.body, createdAt: now });
    await recordEvent(tx, ticket!.id, actor.id, 'created', { priority: input.priority }, now);
    return ticket!;
  });
}
