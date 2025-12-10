import { pgEnum } from 'drizzle-orm/pg-core';

export const ROLES = ['customer', 'agent', 'admin'] as const;
export type Role = (typeof ROLES)[number];
export const roleEnum = pgEnum('user_role', ROLES);

export const TICKET_STATUSES = ['new', 'open', 'pending', 'on_hold', 'solved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const ticketStatusEnum = pgEnum('ticket_status', TICKET_STATUSES);

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export const ticketPriorityEnum = pgEnum('ticket_priority', TICKET_PRIORITIES);
