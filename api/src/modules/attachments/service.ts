import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { DbOrTx } from '../../db/client.js';
import { attachments, messages, type Attachment, type User } from '../../db/schema/index.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { isStaff } from '../../plugins/auth.js';
import { loadTicketFor } from '../tickets/access.js';

export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

/** Drops control characters from an uploaded file name. */
export function sanitizeFilename(name: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[\u0000-\u001f\u007f"]/g, '').trim();
  return (cleaned || 'file').slice(0, 200);
}

/** Links freshly uploaded files to a message. Only the uploader's unlinked files qualify. */
export async function linkAttachments(
  db: DbOrTx,
  uploaderId: number,
  ids: string[],
  ticketId: number,
  messageId: number,
): Promise<Attachment[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  if (unique.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw badRequest(`At most ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message`);
  }
  const linked = await db
    .update(attachments)
    .set({ ticketId, messageId })
    .where(
      and(
        inArray(attachments.id, unique),
        eq(attachments.uploaderId, uploaderId),
        isNull(attachments.messageId),
      ),
    )
    .returning();
  if (linked.length !== unique.length) {
    throw badRequest('Some attachments were not found or are already in use');
  }
  return linked;
}

export async function attachmentsForMessages(
  db: DbOrTx,
  messageIds: number[],
): Promise<Map<number, Attachment[]>> {
  const result = new Map<number, Attachment[]>();
  if (messageIds.length === 0) return result;
  const rows = await db
    .select()
    .from(attachments)
    .where(inArray(attachments.messageId, messageIds))
    .orderBy(attachments.createdAt);
  for (const row of rows) {
    const list = result.get(row.messageId!) ?? [];
    list.push(row);
    result.set(row.messageId!, list);
  }
  return result;
}

/** Loads an attachment if the viewer may download it; 404 otherwise. */
export async function getAttachmentFor(db: DbOrTx, viewer: User, id: string): Promise<Attachment> {
  const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));
  if (!attachment) throw notFound('Attachment');

  if (attachment.messageId === null || attachment.ticketId === null) {
    if (attachment.uploaderId !== viewer.id) throw notFound('Attachment');
    return attachment;
  }

  await loadTicketFor(db, viewer, attachment.ticketId);
  if (!isStaff(viewer)) {
    const [message] = await db
      .select({ internal: messages.internal })
      .from(messages)
      .where(eq(messages.id, attachment.messageId));
    if (!message || message.internal) throw notFound('Attachment');
  }
  return attachment;
}
