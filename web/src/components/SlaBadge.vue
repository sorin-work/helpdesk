<script setup lang="ts">
import { computed } from 'vue';
import type { SlaClock } from '../api/types';
import { formatDateTime, formatRelative, SLA_LABELS } from '../utils/format';

const props = defineProps<{
  clock: SlaClock;
  label?: string;
  /** Reference time, mostly for tests. */
  now?: Date;
}>();

const text = computed(() => {
  const { state, dueAt } = props.clock;
  if (!dueAt || state === 'none') return SLA_LABELS.none;
  if (state === 'breached') return 'Overdue';
  // Met and paused clocks have nothing to count down to.
  if (state === 'met' || state === 'paused') return SLA_LABELS[state];
  return `Due ${formatRelative(dueAt, props.now)}`;
});

const title = computed(() => {
  const due = props.clock.dueAt ? `due ${formatDateTime(props.clock.dueAt)}` : 'no target';
  return `${props.label ?? 'SLA'}: ${SLA_LABELS[props.clock.state]}, ${due}`;
});
</script>

<template>
  <span class="badge sla" :class="`sla-${clock.state}`" :title="title">
    <span v-if="label" class="label">{{ label }}</span>
    {{ text }}
  </span>
</template>

<style scoped>
.label {
  font-weight: 400;
  opacity: 0.8;
}

.sla-on_track {
  color: var(--text-muted);
}

.sla-due_soon {
  background: var(--warning-soft);
  border-color: #f5d39c;
  color: var(--warning);
}

.sla-breached {
  background: var(--danger-soft);
  border-color: #f5c0c0;
  color: var(--danger);
  font-weight: 600;
}

.sla-met {
  background: var(--success-soft);
  border-color: #b9e3c8;
  color: var(--success);
}

.sla-paused {
  border-style: dashed;
}
</style>
