import { asc, eq } from 'drizzle-orm';
import type { DbOrTx } from '../../db/client.js';
import { ticketEvents, users } from '../../db/schema/index.js';
import { toEventDto, type EventDto } from './dto.js';

export type EventType = 'created' | 'status_changed' | 'priority_changed' | 'assigned';

export async function recordEvent(
  db: DbOrTx,
  ticketId: number,
  actorId: number | null,
  type: EventType,
  data: Record<string, unknown>,
  at: Date,
): Promise<void> {
  await db.insert(ticketEvents).values({ ticketId, actorId, type, data, createdAt: at });
}

export async function listEvents(db: DbOrTx, ticketId: number): Promise<EventDto[]> {
  const rows = await db
    .select({ event: ticketEvents, actor: { id: users.id, name: users.name } })
    .from(ticketEvents)
    .leftJoin(users, eq(users.id, ticketEvents.actorId))
    .where(eq(ticketEvents.ticketId, ticketId))
    .orderBy(asc(ticketEvents.createdAt), asc(ticketEvents.id));
  return rows.map((row) => toEventDto(row.event, row.actor));
}
