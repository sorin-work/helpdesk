import { describe, expect, it } from 'vitest';
import { renderPlaceholders, type PlaceholderContext } from './placeholders.js';

const ctx: PlaceholderContext = {
  customer: { name: 'Maria Gonzalez Ruiz', email: 'maria@example.test' },
  agent: { name: 'Alex Rivera', email: 'alex@example.test' },
  ticket: { id: 1042, subject: 'Charged twice', status: 'on_hold', priority: 'high' },
};

describe('renderPlaceholders', () => {
  it('fills in customer, agent and ticket details', () => {
    const text = renderPlaceholders(
      'Hi {{customer.first_name}}, about #{{ticket.id}} "{{ticket.subject}}". - {{agent.name}}',
      ctx,
    );
    expect(text).toBe('Hi Maria, about #1042 "Charged twice". - Alex Rivera');
  });

  it('allows spaces inside the braces', () => {
    expect(renderPlaceholders('{{ agent.first_name }}', ctx)).toBe('Alex');
  });

  it('formats the status for people', () => {
    expect(renderPlaceholders('Status: {{ticket.status}}', ctx)).toBe('Status: on hold');
  });

  it('leaves unknown placeholders alone', () => {
    expect(renderPlaceholders('Hi {{customer.nickname}}', ctx)).toBe('Hi {{customer.nickname}}');
  });

  it('does not treat values as templates', () => {
    const tricky = { ...ctx, ticket: { ...ctx.ticket, subject: '{{agent.email}}' } };
    expect(renderPlaceholders('{{ticket.subject}}', tricky)).toBe('{{agent.email}}');
  });
});
