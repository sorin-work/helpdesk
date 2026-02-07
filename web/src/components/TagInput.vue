<script setup lang="ts">
import { ref } from 'vue';
import { normalizeTag } from '../utils/tags';

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    suggestions?: string[];
    placeholder?: string;
  }>(),
  { suggestions: () => [], placeholder: 'Add tag' },
);

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();
const draft = ref('');

function add() {
  const tag = normalizeTag(draft.value);
  draft.value = '';
  if (!tag) return;
  emit('update:modelValue', [...props.modelValue, tag]);
}

function remove(tag: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter((t) => t !== tag),
  );
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    add();
  } else if (event.key === 'Backspace' && draft.value === '' && props.modelValue.length) {
    remove(props.modelValue[props.modelValue.length - 1]!);
  }
}
</script>

<template>
  <div class="tag-input">
    <span v-for="tag in modelValue" :key="tag" class="tag">
      {{ tag }}
      <button type="button" class="remove" :aria-label="`Remove ${tag}`" @click="remove(tag)">
        ×
      </button>
    </span>
    <input
      v-model="draft"
      type="text"
      :placeholder="placeholder"
      list="tag-suggestions"
      @keydown="onKeydown"
      @blur="add"
    />
    <datalist id="tag-suggestions">
      <option v-for="s in suggestions" :key="s" :value="s" />
    </datalist>
  </div>
</template>

<style scoped>
.tag-input {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  padding: 4px 6px;
  background: var(--surface);
}

.tag-input input {
  border: none;
  flex: 1;
  min-width: 80px;
  padding: 3px 4px;
  box-shadow: none;
}

.remove {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  padding: 0 0 0 2px;
  font-size: 14px;
  line-height: 1;
}
</style>
