import { asc, eq } from 'drizzle-orm';
import type { DbOrTx } from '../../db/client.js';
import { cannedResponses, users, type CannedResponse, type User } from '../../db/schema/index.js';
import { conflict, notFound } from '../../lib/errors.js';
import { renderPlaceholders } from '../../lib/placeholders.js';
import { loadTicketFor } from '../tickets/access.js';

export interface CannedResponseInput {
  title: string;
  body: string;
}

export interface CannedResponseDto {
  id: number;
  title: string;
  body: string;
  createdBy: { id: number; name: string } | null;
  updatedAt: string;
}

function toDto(
  row: CannedResponse,
  author: { id: number; name: string } | null,
): CannedResponseDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdBy: author,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string }).code === '23505';
}

export async function listCannedResponses(db: DbOrTx): Promise<CannedResponseDto[]> {
  const rows = await db
    .select({ row: cannedResponses, author: { id: users.id, name: users.name } })
    .from(cannedResponses)
    .leftJoin(users, eq(users.id, cannedResponses.createdById))
    .orderBy(asc(cannedResponses.title));
  return rows.map((r) => toDto(r.row, r.author));
}

async function getCanned(db: DbOrTx, id: number): Promise<CannedResponse> {
  const [row] = await db.select().from(cannedResponses).where(eq(cannedResponses.id, id));
  if (!row) throw notFound('Canned response');
  return row;
}

export async function createCannedResponse(
  db: DbOrTx,
  actor: User,
  input: CannedResponseInput,
): Promise<CannedResponseDto> {
  try {
    const [row] = await db
      .insert(cannedResponses)
      .values({ ...input, createdById: actor.id })
      .returning();
    return toDto(row!, { id: actor.id, name: actor.name });
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('A canned response with this title already exists');
    throw err;
  }
}

export async function updateCannedResponse(
  db: DbOrTx,
  id: number,
  input: Partial<CannedResponseInput>,
): Promise<void> {
  await getCanned(db, id);
  try {
    await db
      .update(cannedResponses)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(cannedResponses.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('A canned response with this title already exists');
    throw err;
  }
}

export async function deleteCannedResponse(db: DbOrTx, id: number): Promise<void> {
  await getCanned(db, id);
  await db.delete(cannedResponses).where(eq(cannedResponses.id, id));
}

/** Fills in placeholders for a specific ticket and the agent who is replying. */
export async function renderCannedResponse(
  db: DbOrTx,
  agent: User,
  id: number,
  ticketId: number,
): Promise<string> {
  const canned = await getCanned(db, id);
  const ticket = await loadTicketFor(db, agent, ticketId);
  const [customer] = await db.select().from(users).where(eq(users.id, ticket.requesterId));
  return renderPlaceholders(canned.body, {
    customer: { name: customer?.name ?? '', email: customer?.email ?? '' },
    agent: { name: agent.name, email: agent.email },
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
    },
  });
}
