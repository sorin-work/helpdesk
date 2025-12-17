import { and, asc, count, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Db, DbOrTx } from '../../db/client.js';
import {
  messages,
  tickets,
  users,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
  type User,
} from '../../db/schema/index.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { canTransition, UNSOLVED_STATUSES } from '../../lib/status.js';
import { isStaff } from '../../plugins/auth.js';
import { getPolicy, getSchedule } from '../sla/service.js';
import { loadTicketFor } from './access.js';
import { toMessageDto, toTicketSummary, type TicketDetailDto } from './dto.js';
import { recordEvent } from './events.js';
import { dueDateFields, statusChangeFields } from './sla-fields.js';

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

export const VIEWS = ['unassigned', 'mine', 'open', 'overdue', 'solved', 'all'] as const;
export type TicketView = (typeof VIEWS)[number];

export interface ListTicketsInput {
  view?: TicketView;
  page: number;
  pageSize: number;
}

const unsolved = () => inArray(tickets.status, [...UNSOLVED_STATUSES]);

function viewCondition(view: TicketView, viewer: User): SQL | undefined {
  switch (view) {
    case 'unassigned':
      return and(unsolved(), isNull(tickets.assigneeId));
    case 'mine':
      return and(unsolved(), eq(tickets.assigneeId, viewer.id));
    case 'open':
      return unsolved();
    case 'solved':
      return inArray(tickets.status, ['solved', 'closed']);
    case 'all':
      return undefined;
  }
}

export async function listTickets(db: Db, viewer: User, input: ListTicketsInput, now: Date) {
  const conditions: (SQL | undefined)[] = [];
  if (!isStaff(viewer)) {
    conditions.push(eq(tickets.requesterId, viewer.id));
  } else if (input.view) {
    conditions.push(viewCondition(input.view, viewer));
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

/** Ticket counts for the agent sidebar. */
export async function viewCounts(db: Db, viewer: User) {
  const countWhere = async (where: SQL | undefined) => {
    const [row] = await db.select({ value: count() }).from(tickets).where(where);
    return row?.value ?? 0;
  };
  const [unassigned, mine, open] = await Promise.all([
    countWhere(viewCondition('unassigned', viewer)),
    countWhere(viewCondition('mine', viewer)),
    countWhere(viewCondition('open', viewer)),
  ]);
  return { unassigned, mine, open };
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

// ---------------------------------------------------------------------------
// Updating

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: number | null;
}

export async function assertAssignable(db: DbOrTx, id: number): Promise<User> {
  const [agent] = await db.select().from(users).where(eq(users.id, id));
  if (!agent || !agent.active || !isStaff(agent)) {
    throw badRequest('Tickets can only be assigned to active agents');
  }
  return agent;
}

export async function updateTicket(
  db: Db,
  actor: User,
  id: number,
  input: UpdateTicketInput,
  now: Date,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [ticket] = await tx.select().from(tickets).where(eq(tickets.id, id)).for('update');
    if (!ticket) throw notFound('Ticket');

    const patch: Partial<Ticket> = {};
    const schedule = await getSchedule(tx);
    let target = await getPolicy(tx, ticket.priority);

    if (input.priority && input.priority !== ticket.priority) {
      target = await getPolicy(tx, input.priority);
      patch.priority = input.priority;
      Object.assign(patch, dueDateFields(ticket, target, schedule));
      await recordEvent(
        tx,
        id,
        actor.id,
        'priority_changed',
        { from: ticket.priority, to: input.priority },
        now,
      );
    }

    if (input.status && input.status !== ticket.status) {
      if (!canTransition(ticket.status, input.status)) {
        throw badRequest(`A ${ticket.status} ticket cannot be moved to ${input.status}`);
      }
      Object.assign(patch, statusChangeFields(ticket, input.status, now));
      await recordEvent(
        tx,
        id,
        actor.id,
        'status_changed',
        { from: ticket.status, to: input.status },
        now,
      );
    }

    if (input.assigneeId !== undefined && input.assigneeId !== ticket.assigneeId) {
      const previous = ticket.assigneeId ? await findPerson(tx, ticket.assigneeId) : null;
      const next = input.assigneeId === null ? null : await assertAssignable(tx, input.assigneeId);
      patch.assigneeId = next?.id ?? null;
      await recordEvent(
        tx,
        id,
        actor.id,
        'assigned',
        {
          from: previous ? { id: previous.id, name: previous.name } : null,
          to: next ? { id: next.id, name: next.name } : null,
        },
        now,
      );
    }

    if (Object.keys(patch).length > 0) {
      await tx
        .update(tickets)
        .set({ ...patch, updatedAt: now })
        .where(eq(tickets.id, id));
    }
  });
}

async function findPerson(db: DbOrTx, id: number) {
  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, id));
  return user ?? null;
}
