<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { api, errorMessage } from '../../api/client';
import type { Page, TicketSummary } from '../../api/types';
import PaginationBar from '../../components/PaginationBar.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { formatDate, formatRelative } from '../../utils/format';

const filter = ref<'open' | 'solved' | 'all'>('open');
const page = ref(1);
const result = ref<Page<TicketSummary> | null>(null);
const error = ref('');

const STATUS_FILTER = {
  open: 'new,open,pending,on_hold',
  solved: 'solved,closed',
  all: undefined,
};

async function load() {
  error.value = '';
  try {
    result.value = await api.get<Page<TicketSummary>>('/tickets', {
      status: STATUS_FILTER[filter.value],
      page: page.value,
      pageSize: 20,
    });
  } catch (err) {
    error.value = errorMessage(err);
  }
}

watch(filter, () => {
  page.value = 1;
  void load();
});
watch(page, load);
onMounted(load);
</script>

<template>
  <div class="page page-narrow">
    <div class="page-header">
      <h1>Your requests</h1>
      <RouterLink to="/portal/new" class="btn btn-primary">New request</RouterLink>
    </div>

    <div class="row filters">
      <button
        v-for="f in ['open', 'solved', 'all'] as const"
        :key="f"
        type="button"
        class="btn btn-small"
        :class="{ 'btn-primary': filter === f }"
        @click="filter = f"
      >
        {{ f === 'open' ? 'Open' : f === 'solved' ? 'Solved' : 'All' }}
      </button>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-if="result && result.items.length === 0" class="card empty">
      <p>No requests here.</p>
      <RouterLink to="/portal/new">Ask us something</RouterLink>
    </div>

    <div v-else-if="result" class="card">
      <RouterLink
        v-for="ticket in result.items"
        :key="ticket.id"
        :to="`/portal/tickets/${ticket.id}`"
        class="request"
      >
        <div class="row">
          <strong>{{ ticket.subject }}</strong>
          <span class="spacer" />
          <StatusBadge :status="ticket.status" />
        </div>
        <div class="faint">
          #{{ ticket.id }} · opened {{ formatDate(ticket.createdAt) }} · last activity
          {{ formatRelative(ticket.lastMessageAt) }}
        </div>
      </RouterLink>
      <PaginationBar
        v-if="result.total > result.pageSize"
        :page="result.page"
        :page-size="result.pageSize"
        :total="result.total"
        @change="page = $event"
      />
    </div>
  </div>
</template>

<style scoped>
.filters {
  margin-bottom: 12px;
}

.request {
  display: block;
  padding: 14px 18px;
  color: inherit;
  border-bottom: 1px solid var(--border);
}

.request:hover {
  background: var(--surface-muted);
  text-decoration: none;
}
</style>
