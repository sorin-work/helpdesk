<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ page: number; pageSize: number; total: number }>();
defineEmits<{ change: [page: number] }>();

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const from = computed(() => (props.page - 1) * props.pageSize + 1);
const to = computed(() => Math.min(props.total, props.page * props.pageSize));
</script>

<template>
  <div class="pagination">
    <span class="muted">{{ from }}–{{ to }} of {{ total }}</span>
    <button
      type="button"
      class="btn btn-small"
      :disabled="page <= 1"
      @click="$emit('change', page - 1)"
    >
      Previous
    </button>
    <button
      type="button"
      class="btn btn-small"
      :disabled="page >= pages"
      @click="$emit('change', page + 1)"
    >
      Next
    </button>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px;
}

.pagination span {
  margin-right: 8px;
}
</style>
