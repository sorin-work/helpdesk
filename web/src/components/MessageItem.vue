<script setup lang="ts">
import type { Message } from '../api/types';
import { formatDateTime, initials } from '../utils/format';

defineProps<{ message: Message }>();
</script>

<template>
  <article
    class="message"
    :class="{ internal: message.internal, staff: message.author.role !== 'customer' }"
  >
    <div class="avatar" aria-hidden="true">{{ initials(message.author.name) }}</div>
    <div class="content">
      <header>
        <strong>{{ message.author.name }}</strong>
        <span v-if="message.internal" class="badge note-badge">Internal note</span>
        <time class="faint" :datetime="message.createdAt">{{
          formatDateTime(message.createdAt)
        }}</time>
      </header>
      <div class="body">{{ message.body }}</div>
    </div>
  </article>
</template>

<style scoped>
.message {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.message:last-child {
  border-bottom: none;
}

.message.internal {
  background: var(--note);
  border-left: 3px solid var(--note-border);
}

.avatar {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: var(--surface-muted);
  border: 1px solid var(--border);
}

.staff .avatar {
  background: var(--primary-soft);
  color: var(--primary-hover);
  border-color: transparent;
}

.content {
  flex: 1;
  min-width: 0;
}

header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

header time {
  margin-left: auto;
}

.body {
  white-space: pre-wrap;
}

.note-badge {
  background: var(--note-border);
  border-color: var(--note-border);
  color: #6b4e00;
}
</style>
