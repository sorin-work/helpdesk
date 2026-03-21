<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, errorMessage } from '../api/client';
import type { SearchHit } from '../api/types';
import PriorityBadge from '../components/PriorityBadge.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { useAuthStore } from '../stores/auth';
import { formatRelative } from '../utils/format';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const query = ref(String(route.query.q ?? ''));
const hits = ref<SearchHit[]>([]);
const loading = ref(false);
const searched = ref(false);
const error = ref('');

async function run(q: string) {
  if (!q.trim()) return;
  loading.value = true;
  error.value = '';
  try {
    hits.value = (await api.get<{ items: SearchHit[] }>('/search', { q })).items;
    searched.value = true;
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.query.q,
  (q) => {
    query.value = String(q ?? '');
    void run(query.value);
  },
  { immediate: true },
);

function submit() {
  router.replace({ query: { q: query.value } });
}

const link = (id: number) => (auth.isStaff ? `/tickets/${id}` : `/portal/tickets/${id}`);
</script>

<template>
  <div class="page page-narrow">
    <div class="page-header"><h1>Search</h1></div>
    <form class="row search-form" @submit.prevent="submit">
      <input
        v-model="query"
        type="search"
        placeholder='Words, "exact phrases", -exclusions or #1042'
        aria-label="Search"
        autofocus
      />
      <button type="submit" class="btn btn-primary">Search</button>
    </form>

    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-else-if="loading" class="muted">Searching…</div>
    <div v-else-if="searched && hits.length === 0" class="card empty">
      Nothing matched “{{ route.query.q }}”.
    </div>

    <div v-if="hits.length" class="card">
      <RouterLink v-for="hit in hits" :key="hit.id" :to="link(hit.id)" class="hit">
        <div class="row">
          <span class="faint">#{{ hit.id }}</span>
          <strong>{{ hit.subject }}</strong>
          <span class="spacer" />
          <PriorityBadge :priority="hit.priority" />
          <StatusBadge :status="hit.status" />
        </div>
        <!-- The API escapes the text and only adds <mark> around matches. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-if="hit.snippet" class="snippet" v-html="hit.snippet" />
        <div class="faint">
          {{ hit.requesterName }} · updated {{ formatRelative(hit.updatedAt) }}
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.search-form {
  margin-bottom: 16px;
  flex-wrap: nowrap;
}

.hit {
  display: block;
  padding: 14px 18px;
  color: inherit;
  border-bottom: 1px solid var(--border);
}

.hit:last-child {
  border-bottom: none;
}

.hit:hover {
  background: var(--surface-muted);
  text-decoration: none;
}

.snippet {
  margin: 6px 0;
  color: var(--text-muted);
}

.snippet :deep(mark) {
  background: #fff1a8;
  color: inherit;
  padding: 0 1px;
}
</style>
