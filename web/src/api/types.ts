export type Role = 'customer' | 'agent' | 'admin';
export type TicketStatus = 'new' | 'open' | 'pending' | 'on_hold' | 'solved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SlaState = 'none' | 'on_track' | 'due_soon' | 'breached' | 'met' | 'paused';
export type TicketView = 'unassigned' | 'mine' | 'open' | 'overdue' | 'solved' | 'all';
export type TicketSort = 'updated' | 'created' | 'oldest' | 'due' | 'priority';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  available: boolean;
  createdAt: string;
}

export interface SlaClock {
  state: SlaState;
  dueAt: string | null;
}

export interface Sla {
  firstResponse: SlaClock;
  resolution: SlaClock;
}

export interface TicketSummary {
  id: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  requester: { id: number; name: string; email: string };
  assignee: { id: number; name: string } | null;
  tags: string[];
  sla: Sla;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  solvedAt: string | null;
}

export interface Message {
  id: number;
  body: string;
  internal: boolean;
  author: { id: number; name: string; role: Role };
  createdAt: string;
}

export interface TicketDetail extends TicketSummary {
  messages: Message[];
}

export interface TicketEvent {
  id: number;
  type: string;
  data: Record<string, unknown>;
  actor: { id: number; name: string } | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ViewCounts = Record<'unassigned' | 'mine' | 'open' | 'overdue', number>;

export interface CannedResponse {
  id: number;
  title: string;
  body: string;
  createdBy: { id: number; name: string } | null;
  updatedAt: string;
}

export interface Placeholder {
  key: string;
  description: string;
}

export interface TagCount {
  name: string;
  tickets: number;
  open: number;
}

export interface ReplyPayload {
  body: string;
  internal: boolean;
  status?: TicketStatus;
}
