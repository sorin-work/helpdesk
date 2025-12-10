import { index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { tickets } from './tickets.js';
import { users } from './users.js';

/** Audit trail shown in the ticket timeline: status changes, assignments and so on. */
export const ticketEvents = pgTable(
  'ticket_events',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    actorId: integer('actor_id').references(() => users.id, { onDelete: 'set null' }),
    type: text('type').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('ticket_events_ticket_idx').on(table.ticketId, table.createdAt)],
);

export type TicketEvent = typeof ticketEvents.$inferSelect;
