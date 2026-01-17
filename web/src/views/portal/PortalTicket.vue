<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, errorMessage } from '../../api/client';
import type { ReplyPayload, TicketDetail } from '../../api/types';
import MessageItem from '../../components/MessageItem.vue';
import ReplyComposer from '../../components/ReplyComposer.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { formatDateTime } from '../../utils/format';

const props = defineProps<{ id: number }>();

const ticket = ref<TicketDetail | null>(null);
const error = ref('');

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
          <div class="faint">#{{ ticket.id }} · opened {{ formatDateTime(ticket.createdAt) }}</div>
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
