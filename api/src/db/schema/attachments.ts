import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { messages } from './messages.js';
import { tickets } from './tickets.js';
import { users } from './users.js';

/**
 * Files are uploaded first and linked to a message when it is posted. Until
 * then ticket_id and message_id are null and only the uploader can see them.
 */
export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
    messageId: integer('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    uploaderId: integer('uploader_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    storageKey: text('storage_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('attachments_message_idx').on(table.messageId)],
);

export type Attachment = typeof attachments.$inferSelect;
