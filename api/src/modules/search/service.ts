import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { messages, tickets, users, type User } from '../../db/schema/index.js';
import { isStaff } from '../../plugins/auth.js';

/** websearch syntax: quoted phrases, "or", and -exclusions all work. */
function tsQuery(q: string): SQL {
  return sql`websearch_to_tsquery('english', ${q})`;
}

/**
 * Matches tickets whose subject or any message matches the query. Customers
 * never match on internal notes.
 */
export function textSearchCondition(q: string, includeInternal: boolean): SQL {
  const query = tsQuery(q);
  const messageMatch = sql`exists (
    select 1 from ${messages}
    where ${messages.ticketId} = ${tickets.id}
      and ${messages.search} @@ ${query}
      ${includeInternal ? sql`` : sql`and ${messages.internal} = false`}
  )`;
  const conditions = [sql`${tickets.search} @@ ${query}`, messageMatch];
  return sql`(${sql.join(conditions, sql` or `)})`;
}

export interface SearchHit {
  id: number;
  subject: string;
  status: string;
  priority: string;
  requesterName: string;
  updatedAt: string;
  /** Matching text with <mark> around the hits. */
  snippet: string | null;
}

export async function searchTickets(
  db: Db,
  viewer: User,
  q: string,
  limit = 25,
): Promise<SearchHit[]> {
  const staff = isStaff(viewer);
  const query = tsQuery(q);
  const visibleMessages = staff ? sql`` : sql`and m.internal = false`;
  const conditions = [textSearchCondition(q, staff)];
  if (!staff) conditions.push(eq(tickets.requesterId, viewer.id));

  const rows = await db
    .select({
      id: tickets.id,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      requesterName: users.name,
      updatedAt: tickets.updatedAt,
      rank: sql<number>`ts_rank(${tickets.search}, ${query}) + coalesce((
        select max(ts_rank(m.search, ${query})) from ${messages} m
        where m.ticket_id = ${tickets.id} ${visibleMessages}), 0)`.as('rank'),
      snippet: sql<string | null>`(
        select ts_headline('english', m.body, ${query},
          'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=18, MinWords=6')
        from ${messages} m
        where m.ticket_id = ${tickets.id} and m.search @@ ${query} ${visibleMessages}
        order by ts_rank(m.search, ${query}) desc limit 1)`,
    })
    .from(tickets)
    .innerJoin(users, eq(users.id, tickets.requesterId))
    .where(and(...conditions))
    .orderBy(sql`rank desc`, desc(tickets.updatedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    requesterName: row.requesterName,
    updatedAt: row.updatedAt.toISOString(),
    snippet: row.snippet,
  }));
}
