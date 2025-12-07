import { boolean, integer, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { ticketPriorityEnum } from './enums.js';

export const slaPolicies = pgTable('sla_policies', {
  priority: ticketPriorityEnum('priority').primaryKey(),
  firstResponseMinutes: integer('first_response_minutes').notNull(),
  resolutionMinutes: integer('resolution_minutes').notNull(),
  // When false the targets run on the wall clock (24/7) instead of business hours.
  businessHours: boolean('business_hours').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SlaPolicy = typeof slaPolicies.$inferSelect;
