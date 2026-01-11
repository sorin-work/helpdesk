<script setup lang="ts">
import type { TicketStatus } from '../api/types';
import { STATUS_LABELS } from '../utils/format';

defineProps<{ status: TicketStatus }>();
</script>

<template>
  <span class="badge status" :class="`status-${status}`">{{ STATUS_LABELS[status] }}</span>
</template>

<style scoped>
.status-new {
  background: #fff1e6;
  border-color: #fbd3b1;
  color: #b4530a;
}

.status-open {
  background: var(--danger-soft);
  border-color: #f5c0c0;
  color: var(--danger);
}

.status-pending {
  background: var(--primary-soft);
  border-color: #c7d5fb;
  color: var(--primary-hover);
}

.status-on_hold {
  background: #f1ecfb;
  border-color: #d9cdf5;
  color: #6941c6;
}

.status-solved,
.status-closed {
  background: var(--success-soft);
  border-color: #b9e3c8;
  color: var(--success);
}

.status-closed {
  opacity: 0.75;
}
</style>
