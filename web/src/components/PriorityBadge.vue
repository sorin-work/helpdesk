<script setup lang="ts">
import type { TicketPriority } from '../api/types';
import { PRIORITY_LABELS } from '../utils/format';

defineProps<{ priority: TicketPriority }>();
</script>

<template>
  <span class="priority" :class="`priority-${priority}`">
    <span class="dot" aria-hidden="true" />{{ PRIORITY_LABELS[priority] }}
  </span>
</template>

<style scoped>
.priority {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-faint);
}

.priority-normal .dot {
  background: var(--primary);
}

.priority-high .dot {
  background: var(--warning);
}

.priority-urgent {
  color: var(--danger);
  font-weight: 600;
}

.priority-urgent .dot {
  background: var(--danger);
}
</style>
