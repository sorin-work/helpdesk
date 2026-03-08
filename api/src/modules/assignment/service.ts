import { and, asc, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import type { DbOrTx } from '../../db/client.js';
import { settings, users, type User } from '../../db/schema/index.js';

export const ASSIGNMENT_KEY = 'assignment';

export const assignmentSettingsSchema = z.object({
  /** Round-robin new tickets across available agents. */
  autoAssign: z.boolean(),
});

export type AssignmentSettings = z.infer<typeof assignmentSettingsSchema>;

interface StoredAssignment extends AssignmentSettings {
  lastAgentId: number | null;
}

const DEFAULTS: StoredAssignment = { autoAssign: false, lastAgentId: null };

async function readStored(db: DbOrTx, forUpdate = false): Promise<StoredAssignment> {
  const query = db.select().from(settings).where(eq(settings.key, ASSIGNMENT_KEY));
  const [row] = forUpdate ? await query.for('update') : await query;
  if (!row) return DEFAULTS;
  return { ...DEFAULTS, ...(row.value as Partial<StoredAssignment>) };
}

async function writeStored(db: DbOrTx, value: StoredAssignment): Promise<void> {
  await db
    .insert(settings)
    .values({ key: ASSIGNMENT_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export async function getAssignmentSettings(db: DbOrTx): Promise<AssignmentSettings> {
  const { autoAssign } = await readStored(db);
  return { autoAssign };
}

export async function saveAssignmentSettings(
  db: DbOrTx,
  input: AssignmentSettings,
): Promise<AssignmentSettings> {
  const stored = await readStored(db);
  await writeStored(db, { ...stored, ...input });
  return input;
}

/**
 * Picks the next agent in the rotation, or null when auto-assign is off or
 * nobody is available. Must run inside the transaction that assigns the
 * ticket so two tickets created at once do not land on the same agent.
 */
export async function pickNextAgent(tx: DbOrTx): Promise<User | null> {
  const stored = await readStored(tx, true);
  if (!stored.autoAssign) return null;

  const eligible = and(eq(users.role, 'agent'), eq(users.available, true));
  const after = stored.lastAgentId ?? 0;
  let [next] = await tx
    .select()
    .from(users)
    .where(and(eligible, gt(users.id, after)))
    .orderBy(asc(users.id))
    .limit(1);
  if (!next) {
    [next] = await tx.select().from(users).where(eligible).orderBy(asc(users.id)).limit(1);
  }
  if (!next) return null;

  await writeStored(tx, { ...stored, lastAgentId: next.id });
  return next;
}
