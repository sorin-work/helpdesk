import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Small key/value store for workspace-wide settings (business hours, assignment). */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
