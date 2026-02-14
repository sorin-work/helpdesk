import type { Attachment, Message, Ticket, TicketEvent, User } from '../../db/schema/index.js';
import { slaSummary, type SlaSummary } from '../../lib/sla.js';
import { toPersonDto, type PersonDto } from '../users/dto.js';

export interface TicketSummaryDto {
  id: number;
  subject: string;
  status: Ticket['status'];
  priority: Ticket['priority'];
  requester: { id: number; name: string; email: string };
  assignee: { id: number; name: string } | null;
  tags: string[];
  sla: SlaSummary;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  solvedAt: string | null;
}

export interface AttachmentDto {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface MessageDto {
  id: number;
  body: string;
  internal: boolean;
  author: PersonDto;
  attachments: AttachmentDto[];
  createdAt: string;
}

export interface EventDto {
  id: number;
  type: string;
  data: Record<string, unknown>;
  actor: { id: number; name: string } | null;
  createdAt: string;
}

export interface TicketDetailDto extends TicketSummaryDto {
  messages: MessageDto[];
}

export interface TicketRow {
  ticket: Ticket;
  requester: Pick<User, 'id' | 'name' | 'email'>;
  assignee: Pick<User, 'id' | 'name'> | null;
}

export function toTicketSummary(row: TicketRow, tags: string[], now: Date): TicketSummaryDto {
  const { ticket } = row;
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    requester: { id: row.requester.id, name: row.requester.name, email: row.requester.email },
    assignee: row.assignee ? { id: row.assignee.id, name: row.assignee.name } : null,
    tags,
    sla: slaSummary(ticket, now),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    solvedAt: ticket.solvedAt?.toISOString() ?? null,
  };
}

export function toAttachmentDto(attachment: Attachment): AttachmentDto {
  return {
    id: attachment.id,
    filename: attachment.filename,
    contentType: attachment.contentType,
    size: attachment.size,
  };
}

export function toMessageDto(
  message: Message,
  author: Pick<User, 'id' | 'name' | 'role'>,
  attachments: Attachment[],
): MessageDto {
  return {
    id: message.id,
    body: message.body,
    internal: message.internal,
    author: toPersonDto(author),
    attachments: attachments.map(toAttachmentDto),
    createdAt: message.createdAt.toISOString(),
  };
}

export function toEventDto(event: TicketEvent, actor: Pick<User, 'id' | 'name'> | null): EventDto {
  return {
    id: event.id,
    type: event.type,
    data: event.data,
    actor: actor ? { id: actor.id, name: actor.name } : null,
    createdAt: event.createdAt.toISOString(),
  };
}
