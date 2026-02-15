<script setup lang="ts">
import type { Attachment } from '../api/types';
import { formatFileSize } from '../utils/format';

defineProps<{ attachments: Attachment[]; removable?: boolean }>();
defineEmits<{ remove: [id: string] }>();
</script>

<template>
  <ul v-if="attachments.length" class="attachments">
    <li v-for="file in attachments" :key="file.id">
      <a :href="`/api/attachments/${file.id}`" target="_blank" rel="noopener">
        <span aria-hidden="true">📎</span> {{ file.filename }}
      </a>
      <span class="faint">{{ formatFileSize(file.size) }}</span>
      <button
        v-if="removable"
        type="button"
        class="btn-link btn-small"
        :aria-label="`Remove ${file.filename}`"
        @click="$emit('remove', file.id)"
      >
        Remove
      </button>
    </li>
  </ul>
</template>

<style scoped>
.attachments {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
}

.attachments li {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
