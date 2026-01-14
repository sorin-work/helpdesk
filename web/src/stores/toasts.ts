import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

export const useToastStore = defineStore('toasts', () => {
  const toasts = ref<Toast[]>([]);
  let nextId = 1;

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function show(text: string, kind: Toast['kind'] = 'info', timeout = 4000) {
    const id = nextId++;
    toasts.value.push({ id, kind, text });
    if (timeout > 0) setTimeout(() => dismiss(id), timeout);
    return id;
  }

  return {
    toasts,
    show,
    success: (text: string) => show(text, 'success'),
    error: (text: string) => show(text, 'error', 6000),
    dismiss,
  };
});
