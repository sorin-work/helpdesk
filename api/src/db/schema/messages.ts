import { boolean, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { tickets } from './tickets.js';
import { users } from './users.js';

export const messages = pgTable(
  'messages',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    // Internal notes are only visible to agents and admins.
    internal: boolean('internal').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('messages_ticket_idx').on(table.ticketId, table.createdAt)],
);

export type Message = typeof messages.$inferSelect;
