<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, ApiError, errorMessage } from '../../api/client';
import type { CannedResponse } from '../../api/types';
import { useToastStore } from '../../stores/toasts';

const toasts = useToastStore();
const items = ref<CannedResponse[]>([]);
const editing = ref<CannedResponse | null>(null);
const title = ref('');
const body = ref('');
const error = ref('');

async function load() {
  items.value = (await api.get<{ items: CannedResponse[] }>('/canned-responses')).items;
}

function startNew() {
  editing.value = { id: 0, title: '', body: '', createdBy: null, updatedAt: '' };
  title.value = '';
  body.value = '';
  error.value = '';
}

function edit(item: CannedResponse) {
  editing.value = item;
  title.value = item.title;
  body.value = item.body;
  error.value = '';
}

async function save() {
  if (!editing.value) return;
  error.value = '';
  try {
    if (editing.value.id) {
      await api.patch(`/canned-responses/${editing.value.id}`, {
        title: title.value,
        body: body.value,
      });
    } else {
      await api.post('/canned-responses', { title: title.value, body: body.value });
    }
    toasts.success('Canned response saved');
    editing.value = null;
    await load();
  } catch (err) {
    error.value =
      err instanceof ApiError && err.details.length
        ? Object.values(err.fieldErrors()).join('. ')
        : errorMessage(err);
  }
}

async function remove(item: CannedResponse) {
  try {
    await api.delete(`/canned-responses/${item.id}`);
    if (editing.value?.id === item.id) editing.value = null;
    await load();
  } catch (err) {
    toasts.error(errorMessage(err));
  }
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1>Canned responses</h1>
      <button type="button" class="btn btn-primary" @click="startNew">New response</button>
    </div>

    <div class="layout">
      <div class="card">
        <ul class="list">
          <li v-for="item in items" :key="item.id" :class="{ active: editing?.id === item.id }">
            <button type="button" class="item" @click="edit(item)">
              <strong>{{ item.title }}</strong>
              <span class="faint preview">{{ item.body }}</span>
            </button>
            <button type="button" class="btn btn-small btn-danger" @click="remove(item)">
              Delete
            </button>
          </li>
          <li v-if="items.length === 0" class="empty">No canned responses yet.</li>
        </ul>
      </div>

      <form v-if="editing" class="card" @submit.prevent="save">
        <div class="card-body">
          <h2>{{ editing.id ? 'Edit response' : 'New response' }}</h2>
          <div v-if="error" class="alert alert-error">{{ error }}</div>
          <div class="field">
            <label for="title">Title</label>
            <input id="title" v-model="title" type="text" maxlength="100" required />
          </div>
          <div class="field">
            <label for="body">Text</label>
            <textarea id="body" v-model="body" rows="10" required />
          </div>
          <div class="field row">
            <span class="spacer" />
            <button type="button" class="btn" @click="editing = null">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </div>
      </form>
      <div v-else class="card empty">Pick a response to edit, or create a new one.</div>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  align-items: start;
}

.layout .card + .card {
  margin-top: 0;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
}

.list li.active {
  background: var(--primary-soft);
}

.item {
  flex: 1;
  min-width: 0;
  text-align: left;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.preview {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.placeholders {
  margin-top: 6px;
}

@media (max-width: 860px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
