<script setup lang="ts">
import { ref } from 'vue';
import { api, errorMessage } from '../api/client';
import type { Attachment } from '../api/types';
import AttachmentList from './AttachmentList.vue';

const files = defineModel<Attachment[]>({ default: () => [] });
const uploading = ref(0);
const error = ref('');
const input = ref<HTMLInputElement>();

async function onChange(event: Event) {
  const picked = Array.from((event.target as HTMLInputElement).files ?? []);
  error.value = '';
  for (const file of picked) {
    uploading.value++;
    try {
      const uploaded = await api.upload<Attachment>('/attachments', file);
      files.value = [...files.value, uploaded];
    } catch (err) {
      error.value = `${file.name}: ${errorMessage(err)}`;
    } finally {
      uploading.value--;
    }
  }
}

function remove(id: string) {
  files.value = files.value.filter((f) => f.id !== id);
}
</script>

<template>
  <div class="file-picker">
    <label class="btn btn-small attach">
      <input ref="input" type="file" multiple hidden @change="onChange" />
      Attach files
    </label>
    <span v-if="uploading" class="faint">Uploading…</span>
    <span v-if="error" class="field-error">{{ error }}</span>
    <AttachmentList :attachments="files" removable @remove="remove" />
  </div>
</template>

<style scoped>
.attach {
  margin: 0;
}

.file-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.file-picker :deep(.attachments) {
  width: 100%;
  margin: 0;
}
</style>
