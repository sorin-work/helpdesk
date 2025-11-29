import { pgEnum } from 'drizzle-orm/pg-core';

export const ROLES = ['customer', 'agent', 'admin'] as const;
export type Role = (typeof ROLES)[number];
export const roleEnum = pgEnum('user_role', ROLES);
