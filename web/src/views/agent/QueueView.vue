<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api, errorMessage } from '../../api/client';
import type {
  Page,
  TicketPriority,
  TicketSort,
  TicketStatus,
  TicketSummary,
  TicketView,
} from '../../api/types';
import PaginationBar from '../../components/PaginationBar.vue';
import PriorityBadge from '../../components/PriorityBadge.vue';
import SlaBadge from '../../components/SlaBadge.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useCountsStore } from '../../stores/counts';
import { formatRelative, PRIORITY_LABELS, STATUS_LABELS } from '../../utils/format';
import { CLOCK_LABELS, worstClock } from '../../utils/sla';

const props = defineProps<{ view: TicketView }>();
const router = useRouter();
const counts = useCountsStore();

const VIEWS: { key: TicketView; label: string; counted?: boolean }[] = [
  { key: 'mine', label: 'Assigned to me', counted: true },
  { key: 'unassigned', label: 'Unassigned', counted: true },
  { key: 'open', label: 'All open', counted: true },
  { key: 'overdue', label: 'Overdue', counted: true },
  { key: 'solved', label: 'Recently solved' },
  { key: 'all', label: 'All tickets' },
];

const filters = reactive({
  status: '' as TicketStatus | '',
  priority: '' as TicketPriority | '',
  sort: 'updated' as TicketSort,
});
const page = ref(1);
const result = ref<Page<TicketSummary> | null>(null);
const loading = ref(false);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    result.value = await api.get<Page<TicketSummary>>('/tickets', {
      view: props.view,
      status: filters.status,
      priority: filters.priority,
      sort: filters.sort,
      page: page.value,
    });
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.view,
  () => {
    void load();
    void counts.refresh();
  },
);
watch(
  () => [filters.status, filters.priority, filters.sort],
  () => {
    page.value = 1;
    void load();
  },
);
watch(page, load);

onMounted(() => {
  void load();
  void counts.refresh();
});

function open(ticket: TicketSummary) {
  router.push(`/tickets/${ticket.id}`);
}
</script>

<template>
  <div class="queue">
    <aside class="views">
      <nav aria-label="Views">
        <RouterLink
          v-for="v in VIEWS"
          :key="v.key"
          :to="`/queue/${v.key}`"
          :class="{ active: view === v.key }"
        >
          <span>{{ v.label }}</span>
          <span v-if="v.counted" class="count">{{
            counts.counts[v.key as keyof typeof counts.counts]
          }}</span>
        </RouterLink>
      </nav>
    </aside>

    <section class="list">
      <div class="toolbar row">
        <h1>{{ VIEWS.find((v) => v.key === view)?.label }}</h1>
        <span class="spacer" />
        <select v-model="filters.status" class="inline" aria-label="Status">
          <option value="">Any status</option>
          <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
        <select v-model="filters.priority" class="inline" aria-label="Priority">
          <option value="">Any priority</option>
          <option v-for="(label, key) in PRIORITY_LABELS" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
        <select v-model="filters.sort" class="inline" aria-label="Sort">
          <option value="updated">Recently updated</option>
          <option value="created">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <div class="card">
        <table class="table">
          <thead>
            <tr>
              <th>Subject</th>
              <th class="hide-mobile">Requester</th>
              <th>Status</th>
              <th class="hide-mobile">Priority</th>
              <th class="hide-mobile">Assignee</th>
              <th>SLA</th>
              <th class="hide-mobile">Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ticket in result?.items ?? []"
              :key="ticket.id"
              class="clickable"
              @click="open(ticket)"
            >
              <td>
                <RouterLink :to="`/tickets/${ticket.id}`" class="subject" @click.stop>
                  <span class="faint">#{{ ticket.id }}</span> {{ ticket.subject }}
                </RouterLink>
              </td>
              <td class="hide-mobile">{{ ticket.requester.name }}</td>
              <td><StatusBadge :status="ticket.status" /></td>
              <td class="hide-mobile"><PriorityBadge :priority="ticket.priority" /></td>
              <td class="hide-mobile">
                <span v-if="ticket.assignee">{{ ticket.assignee.name }}</span>
                <span v-else class="faint">Unassigned</span>
              </td>
              <td>
                <SlaBadge
                  :clock="worstClock(ticket.sla).clock"
                  :label="CLOCK_LABELS[worstClock(ticket.sla).kind]"
                />
              </td>
              <td class="hide-mobile muted">{{ formatRelative(ticket.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
        <PaginationBar
          v-if="result && result.total > result.pageSize"
          :page="result.page"
          :page-size="result.pageSize"
          :total="result.total"
          @change="page = $event"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.queue {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.views .new {
  width: 100%;
  margin-bottom: 16px;
}

.views nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.views nav a {
  display: flex;
  justify-content: space-between;
  padding: 7px 10px;
  border-radius: 6px;
  color: var(--text);
}

.views nav a:hover {
  background: var(--surface);
  text-decoration: none;
}

.views nav a.active {
  background: var(--primary-soft);
  color: var(--primary-hover);
  font-weight: 600;
}

.count {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.toolbar {
  margin-bottom: 12px;
}

.toolbar h1 {
  margin: 0;
}

.tag-filter {
  width: 110px;
}

.subject {
  color: var(--text);
  font-weight: 500;
}

.tags {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

@media (max-width: 860px) {
  .queue {
    grid-template-columns: 1fr;
    padding: 16px;
  }
}
</style>
