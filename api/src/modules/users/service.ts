import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import type { DbOrTx } from '../../db/client.js';
import { users, type Role, type User } from '../../db/schema/index.js';
import { conflict, notFound } from '../../lib/errors.js';

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
