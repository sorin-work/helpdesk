<script setup lang="ts">
import type { TicketEvent, TicketPriority, TicketStatus } from '../api/types';
import { formatDateTime, PRIORITY_LABELS, STATUS_LABELS } from '../utils/format';

defineProps<{ events: TicketEvent[] }>();

type Person = { id: number; name: string } | null;

function describe(event: TicketEvent): string {
  const d = event.data;
  switch (event.type) {
    case 'created':
      return 'opened the ticket';
    case 'status_changed':
      return `changed status from ${STATUS_LABELS[d.from as TicketStatus]} to ${STATUS_LABELS[d.to as TicketStatus]}`;
    case 'priority_changed':
      return `changed priority from ${PRIORITY_LABELS[d.from as TicketPriority]} to ${PRIORITY_LABELS[d.to as TicketPriority]}`;
    case 'assigned': {
      const to = d.to as Person;
      if (d.auto) return `auto-assigned to ${to?.name}`;
      return to ? `assigned to ${to.name}` : 'removed the assignee';
    }
    case 'tags_changed': {
      const parts: string[] = [];
      const added = (d.added as string[]) ?? [];
      const removed = (d.removed as string[]) ?? [];
      if (added.length) parts.push(`added ${added.join(', ')}`);
      if (removed.length) parts.push(`removed ${removed.join(', ')}`);
      return `${parts.join(' and ')} tags`.replace(/^ tags$/, 'updated tags');
    }
    case 'subject_changed':
      return `renamed the ticket to “${d.to as string}”`;
    default:
      return event.type.replace(/_/g, ' ');
  }
}
</script>

<template>
  <ol class="timeline">
    <li v-for="event in events" :key="event.id">
      <span class="who">{{ event.actor?.name ?? 'Helpdesk' }}</span>
      {{ describe(event) }}
      <div class="faint">{{ formatDateTime(event.createdAt) }}</div>
    </li>
  </ol>
</template>

<style scoped>
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
}

.timeline li {
  position: relative;
  padding: 0 0 12px 16px;
  border-left: 2px solid var(--border);
}

.timeline li:last-child {
  padding-bottom: 0;
}

.timeline li::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 5px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border-strong);
}

.who {
  font-weight: 600;
}
</style>
