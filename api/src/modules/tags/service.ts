import { asc, count, eq, inArray, sql } from 'drizzle-orm';
import type { DbOrTx } from '../../db/client.js';
import { tags, tickets, ticketTags } from '../../db/schema/index.js';
import { badRequest } from '../../lib/errors.js';
import { UNSOLVED_STATUSES } from '../../lib/status.js';

export const MAX_TAGS_PER_TICKET = 20;

/** "Billing Issue " -> "billing-issue". Returns null for names with nothing usable. */
export function normalizeTag(name: string): string | null {
  const tag = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return tag || null;
}

export async function tagsForTickets(
  db: DbOrTx,
  ticketIds: number[],
): Promise<Map<number, string[]>> {
  const result = new Map<number, string[]>();
  if (ticketIds.length === 0) return result;
  const rows = await db
    .select({ ticketId: ticketTags.ticketId, name: tags.name })
    .from(ticketTags)
    .innerJoin(tags, eq(tags.id, ticketTags.tagId))
    .where(inArray(ticketTags.ticketId, ticketIds))
    .orderBy(asc(tags.name));
  for (const row of rows) {
    const list = result.get(row.ticketId) ?? [];
    list.push(row.name);
    result.set(row.ticketId, list);
  }
  return result;
}

/** Replaces a ticket's tags and returns what was added and removed. */
export async function setTicketTags(
  db: DbOrTx,
  ticketId: number,
  names: string[],
): Promise<{ tags: string[]; added: string[]; removed: string[] }> {
  const wanted = [...new Set(names.map(normalizeTag).filter((t): t is string => t !== null))];
  if (wanted.length > MAX_TAGS_PER_TICKET) {
    throw badRequest(`A ticket can have at most ${MAX_TAGS_PER_TICKET} tags`);
  }
  const current = (await tagsForTickets(db, [ticketId])).get(ticketId) ?? [];

  if (wanted.length > 0) {
    await db
      .insert(tags)
      .values(wanted.map((name) => ({ name })))
      .onConflictDoNothing();
  }
  const rows = wanted.length ? await db.select().from(tags).where(inArray(tags.name, wanted)) : [];

  await db.delete(ticketTags).where(eq(ticketTags.ticketId, ticketId));
  if (rows.length > 0) {
    await db.insert(ticketTags).values(rows.map((tag) => ({ ticketId, tagId: tag.id })));
  }

  return {
    tags: [...wanted].sort(),
    added: wanted.filter((t) => !current.includes(t)).sort(),
    removed: current.filter((t) => !wanted.includes(t)).sort(),
  };
}

/** All tags in use, with how many unsolved tickets carry each. */
export async function listTags(db: DbOrTx) {
  return db
    .select({
      name: tags.name,
      tickets: count(ticketTags.ticketId),
      open: sql<number>`count(*) filter (where ${inArray(tickets.status, [...UNSOLVED_STATUSES])})`.mapWith(
        Number,
      ),
    })
    .from(tags)
    .innerJoin(ticketTags, eq(ticketTags.tagId, tags.id))
    .innerJoin(tickets, eq(tickets.id, ticketTags.ticketId))
    .groupBy(tags.name)
    .orderBy(asc(tags.name));
}
