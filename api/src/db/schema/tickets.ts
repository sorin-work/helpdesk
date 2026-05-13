import { sql } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { ticketPriorityEnum, ticketStatusEnum } from './enums.js';
import { tsvector } from './types.js';
import { users } from './users.js';

export const tickets = pgTable(
  'tickets',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1001 }),
    subject: text('subject').notNull(),
    status: ticketStatusEnum('status').notNull().default('new'),
    priority: ticketPriorityEnum('priority').notNull().default('normal'),
    requesterId: integer('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assigneeId: integer('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    firstResponseDueAt: timestamp('first_response_due_at', { withTimezone: true }),
    resolutionDueAt: timestamp('resolution_due_at', { withTimezone: true }),
    firstRespondedAt: timestamp('first_responded_at', { withTimezone: true }),
    // Business minutes, frozen when the event happens so reports stay stable.
    firstResponseMinutes: integer('first_response_minutes'),
    resolutionMinutes: integer('resolution_minutes'),
    slaPausedAt: timestamp('sla_paused_at', { withTimezone: true }),
    slaPausedMinutes: integer('sla_paused_minutes').notNull().default(0),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
    solvedAt: timestamp('solved_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    search: tsvector('search').generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(subject, ''))`,
    ),
  },
  (table) => [
    index('tickets_requester_idx').on(table.requesterId),
    index('tickets_status_assignee_idx').on(table.status, table.assigneeId),
    index('tickets_search_idx').using('gin', table.search),
  ],
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
