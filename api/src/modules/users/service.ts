import bcrypt from 'bcryptjs';
import { and, asc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { DbOrTx } from '../../db/client.js';
import { users, type Role, type User } from '../../db/schema/index.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(db: DbOrTx, email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizeEmail(email)}`);
  return user;
}

export async function getUser(db: DbOrTx, id: number): Promise<User> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) throw notFound('User');
  return user;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
}

export async function createUser(
  db: DbOrTx,
  input: CreateUserInput,
  bcryptRounds: number,
): Promise<User> {
  if (await findUserByEmail(db, input.email)) {
    throw conflict('An account with this email already exists');
  }
  const passwordHash = await bcrypt.hash(input.password, bcryptRounds);
  const [user] = await db
    .insert(users)
    .values({
      email: normalizeEmail(input.email),
      name: input.name.trim(),
      passwordHash,
      role: input.role,
    })
    .returning();
  return user!;
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function changePassword(
  db: DbOrTx,
  user: User,
  currentPassword: string,
  newPassword: string,
  bcryptRounds: number,
): Promise<void> {
  if (!(await verifyPassword(user, currentPassword))) {
    throw badRequest('Current password is incorrect');
  }
  const passwordHash = await bcrypt.hash(newPassword, bcryptRounds);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
}

export interface ListUsersFilter {
  role?: Role;
  q?: string;
  includeInactive?: boolean;
}

export async function listUsers(db: DbOrTx, filter: ListUsersFilter): Promise<User[]> {
  const conditions: SQL[] = [];
  if (filter.role) conditions.push(eq(users.role, filter.role));
  if (!filter.includeInactive) conditions.push(eq(users.active, true));
  if (filter.q) {
    const pattern = `%${filter.q.replace(/[%_\\]/g, '\\$&')}%`;
    conditions.push(or(ilike(users.name, pattern), ilike(users.email, pattern))!);
  }
  return db
    .select()
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(users.name))
    .limit(200);
}

/** Active agents and admins: everyone who can be assigned a ticket. */
export async function listStaff(db: DbOrTx): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(and(inArray(users.role, ['agent', 'admin']), eq(users.active, true)))
    .orderBy(asc(users.name));
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  active?: boolean;
}

export async function updateUser(
  db: DbOrTx,
  actor: User,
  id: number,
  input: UpdateUserInput,
): Promise<User> {
  const target = await getUser(db, id);
  if (target.id === actor.id) {
    if (input.role && input.role !== actor.role) {
      throw badRequest('You cannot change your own role');
    }
    if (input.active === false) throw badRequest('You cannot deactivate yourself');
  }
  const [updated] = await db
    .update(users)
    .set({
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.active !== undefined && { active: input.active }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, target.id))
    .returning();
  return updated!;
}
