<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, errorMessage } from '../../api/client';
import type { ReplyPayload, TicketDetail } from '../../api/types';
import MessageItem from '../../components/MessageItem.vue';
import ReplyComposer from '../../components/ReplyComposer.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useToastStore } from '../../stores/toasts';
import { formatDateTime } from '../../utils/format';

const props = defineProps<{ id: number }>();
const toasts = useToastStore();

const ticket = ref<TicketDetail | null>(null);
const error = ref('');

const canSolve = computed(
  () => ticket.value && !['solved', 'closed'].includes(ticket.value.status),
);

async function load() {
  try {
    ticket.value = await api.get<TicketDetail>(`/tickets/${props.id}`);
  } catch (err) {
    error.value = errorMessage(err);
  }
}

async function send(payload: ReplyPayload) {
  ticket.value = await api.post<TicketDetail>(`/tickets/${props.id}/messages`, payload);
}

async function markSolved() {
  try {
    ticket.value = await api.patch<TicketDetail>(`/tickets/${props.id}`, { status: 'solved' });
    toasts.success('Thanks! We marked your request as solved.');
  } catch (err) {
    toasts.error(errorMessage(err));
  }
}

onMounted(load);
</script>

<template>
  <div class="page page-narrow">
    <RouterLink to="/portal" class="muted">← Your requests</RouterLink>
    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <template v-if="ticket">
      <div class="page-header heading">
        <div>
          <h1>{{ ticket.subject }}</h1>
          <div class="faint">
            #{{ ticket.id }} · opened {{ formatDateTime(ticket.createdAt) }}
            <template v-if="ticket.assignee"> · handled by {{ ticket.assignee.name }}</template>
          </div>
        </div>
        <StatusBadge :status="ticket.status" />
      </div>

      <div class="card">
        <MessageItem v-for="m in ticket.messages" :key="m.id" :message="m" />
      </div>

      <div v-if="ticket.status === 'closed'" class="alert alert-info closed">
        This request is closed. If you need more help,
        <RouterLink to="/portal/new">open a new request</RouterLink>.
      </div>
      <template v-else>
        <ReplyComposer class="reply" :ticket-id="ticket.id" :status="ticket.status" :send="send" />
        <div v-if="canSolve" class="row solve">
          <span class="muted">Problem sorted?</span>
          <button type="button" class="btn btn-small" @click="markSolved">Mark as solved</button>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.heading {
  margin-top: 12px;
  align-items: flex-start;
}

.reply,
.closed {
  margin-top: 16px;
}

.solve {
  justify-content: flex-end;
  margin-top: 10px;
}
</style>
