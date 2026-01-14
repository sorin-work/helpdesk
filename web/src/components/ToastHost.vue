<script setup lang="ts">
import { useToastStore } from '../stores/toasts';

const toasts = useToastStore();
</script>

<template>
  <div class="toasts" aria-live="polite">
    <div
      v-for="toast in toasts.toasts"
      :key="toast.id"
      class="toast"
      :class="toast.kind"
      role="status"
      @click="toasts.dismiss(toast.id)"
    >
      {{ toast.text }}
    </div>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}

.toast {
  padding: 10px 16px;
  border-radius: 6px;
  background: var(--text);
  color: #fff;
  box-shadow: var(--shadow);
  cursor: pointer;
  max-width: 360px;
}

.toast.success {
  background: var(--success);
}

.toast.error {
  background: var(--danger);
}
</style>
