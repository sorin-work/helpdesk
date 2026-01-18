<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, errorMessage } from '../../api/client';
import type {
  ReplyPayload,
  TicketDetail,
  TicketEvent,
  TicketPriority,
  TicketStatus,
  User,
} from '../../api/types';
import MessageItem from '../../components/MessageItem.vue';
import ReplyComposer from '../../components/ReplyComposer.vue';
import SlaBadge from '../../components/SlaBadge.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import TicketTimeline from '../../components/TicketTimeline.vue';
import { useCountsStore } from '../../stores/counts';
import { useToastStore } from '../../stores/toasts';
import { formatDateTime, PRIORITY_LABELS, STATUS_LABELS } from '../../utils/format';
import { statusOptions } from '../../utils/status';

const props = defineProps<{ id: number }>();
const counts = useCountsStore();
const toasts = useToastStore();

const ticket = ref<TicketDetail | null>(null);
const events = ref<TicketEvent[]>([]);
const agents = ref<User[]>([]);
const error = ref('');

const closed = computed(() => ticket.value?.status === 'closed');

async function loadEvents() {
  events.value = (await api.get<{ items: TicketEvent[] }>(`/tickets/${props.id}/events`)).items;
}

function setTicket(next: TicketDetail) {
  ticket.value = next;
}

async function load() {
  error.value = '';
  try {
    const [detail] = await Promise.all([
      api.get<TicketDetail>(`/tickets/${props.id}`),
      loadEvents(),
    ]);
    setTicket(detail);
  } catch (err) {
    error.value = errorMessage(err);
  }
}

async function update(changes: Record<string, unknown>) {
  try {
    setTicket(await api.patch<TicketDetail>(`/tickets/${props.id}`, changes));
    await loadEvents();
    void counts.refresh();
  } catch (err) {
    toasts.error(errorMessage(err));
    await load();
  }
}

async function send(payload: ReplyPayload) {
  setTicket(await api.post<TicketDetail>(`/tickets/${props.id}/messages`, payload));
  await loadEvents();
  void counts.refresh();
}

onMounted(async () => {
  await load();
  agents.value = (await api.get<{ items: User[] }>('/agents')).items;
});

const priorities: TicketPriority[] = ['low', 'normal', 'high', 'urgent'];
</script>

<template>
  <div class="page ticket-page">
    <RouterLink to="/queue/mine" class="muted">← Back to tickets</RouterLink>
    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-if="ticket" class="layout">
      <section class="main">
        <div class="heading">
          <span class="faint">#{{ ticket.id }}</span>
          <h1>{{ ticket.subject }}</h1>
        </div>

        <div class="card">
          <MessageItem v-for="m in ticket.messages" :key="m.id" :message="m" />
        </div>

        <div v-if="closed" class="alert alert-info composer-gap">
          This ticket is closed and can no longer be changed.
        </div>
        <ReplyComposer
          v-else
          class="composer-gap"
          :ticket-id="ticket.id"
          :status="ticket.status"
          :send="send"
          staff
        />
      </section>

      <aside class="side">
        <div class="card">
          <div class="card-body stack">
            <div>
              <h3>Requester</h3>
              <div>
                <strong>{{ ticket.requester.name }}</strong>
              </div>
              <a :href="`mailto:${ticket.requester.email}`" class="muted">
                {{ ticket.requester.email }}
              </a>
            </div>

            <div>
              <label for="status">Status</label>
              <select
                id="status"
                :value="ticket.status"
                :disabled="closed"
                @change="
                  update({ status: ($event.target as HTMLSelectElement).value as TicketStatus })
                "
              >
                <option v-for="s in statusOptions(ticket.status)" :key="s" :value="s">
                  {{ STATUS_LABELS[s] }}
                </option>
              </select>
            </div>

            <div>
              <label for="priority">Priority</label>
              <select
                id="priority"
                :value="ticket.priority"
                :disabled="closed"
                @change="update({ priority: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="p in priorities" :key="p" :value="p">
                  {{ PRIORITY_LABELS[p] }}
                </option>
              </select>
            </div>

            <div>
              <label for="assignee">Assignee</label>
              <div class="row nowrap">
                <select
                  id="assignee"
                  :value="ticket.assignee?.id ?? ''"
                  :disabled="closed"
                  @change="
                    update({
                      assigneeId: Number(($event.target as HTMLSelectElement).value) || null,
                    })
                  "
                >
                  <option value="">Unassigned</option>
                  <option v-for="a in agents" :key="a.id" :value="a.id">
                    {{ a.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body stack">
            <h3>SLA</h3>
            <div class="sla-row">
              <span>First response</span>
              <SlaBadge :clock="ticket.sla.firstResponse" label="" />
            </div>
            <div class="sla-row">
              <span>Resolution</span>
              <SlaBadge :clock="ticket.sla.resolution" label="" />
            </div>
            <div class="row">
              <StatusBadge :status="ticket.status" />
              <span class="faint">opened {{ formatDateTime(ticket.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3>Activity</h3>
            <TicketTimeline :events="events" />
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.ticket-page {
  max-width: 1300px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
  margin-top: 12px;
}

.heading {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
}

.heading h1 {
  margin: 0;
  cursor: text;
}

.subject-input {
  font-size: 20px;
  font-weight: 600;
}

.composer-gap {
  margin-top: 16px;
}

.side .card + .card {
  margin-top: 16px;
}

.nowrap {
  flex-wrap: nowrap;
}

.sla-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.side .stack > div + .faint {
  margin-top: 2px;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
