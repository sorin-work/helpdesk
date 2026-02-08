/**
 * Canned-response placeholders, e.g. "Hi {{customer.first_name}}". Unknown
 * placeholders are left untouched so the agent notices them before sending.
 */

export interface PlaceholderContext {
  customer: { name: string; email: string };
  agent: { name: string; email: string };
  ticket: { id: number; subject: string; status: string; priority: string };
}

export const PLACEHOLDERS = [
  { key: 'customer.name', description: "Customer's full name" },
  { key: 'customer.first_name', description: "Customer's first name" },
  { key: 'customer.email', description: "Customer's email address" },
  { key: 'agent.name', description: 'Your full name' },
  { key: 'agent.first_name', description: 'Your first name' },
  { key: 'ticket.id', description: 'Ticket number' },
  { key: 'ticket.subject', description: 'Ticket subject' },
  { key: 'ticket.status', description: 'Current status' },
  { key: 'ticket.priority', description: 'Current priority' },
] as const;

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

function resolve(key: string, ctx: PlaceholderContext): string | undefined {
  switch (key) {
    case 'customer.name':
      return ctx.customer.name;
    case 'customer.first_name':
      return firstName(ctx.customer.name);
    case 'customer.email':
      return ctx.customer.email;
    case 'agent.name':
      return ctx.agent.name;
    case 'agent.first_name':
      return firstName(ctx.agent.name);
    case 'ticket.id':
      return String(ctx.ticket.id);
    case 'ticket.subject':
      return ctx.ticket.subject;
    case 'ticket.status':
      return ctx.ticket.status.replace('_', ' ');
    case 'ticket.priority':
      return ctx.ticket.priority;
    default:
      return undefined;
  }
}

export function renderPlaceholders(template: string, ctx: PlaceholderContext): string {
  return template.replace(/\{\{\s*([a-z_]+\.[a-z_]+)\s*\}\}/g, (match, key: string) => {
    return resolve(key, ctx) ?? match;
  });
}
