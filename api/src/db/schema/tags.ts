import { index, integer, pgTable, primaryKey, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { tickets } from './tickets.js';

export const tags = pgTable(
  'tags',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
  },
  (table) => [uniqueIndex('tags_name_unique').on(table.name)],
);

export const ticketTags = pgTable(
  'ticket_tags',
  {
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.ticketId, table.tagId] }),
    index('ticket_tags_tag_idx').on(table.tagId),
  ],
);

export type Tag = typeof tags.$inferSelect;
