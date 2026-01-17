<script setup lang="ts">
import { computed, ref } from 'vue';
import { errorMessage } from '../api/client';
import type { ReplyPayload, TicketStatus } from '../api/types';
import { STATUS_LABELS } from '../utils/format';
import { TRANSITIONS } from '../utils/status';

const props = withDefaults(
  defineProps<{
    ticketId: number;
    status: TicketStatus;
    /** Agents get internal notes and a status picker. */
    staff?: boolean;
    send: (payload: ReplyPayload) => Promise<void>;
  }>(),
  { staff: false },
);

const mode = ref<'reply' | 'note'>('reply');
const body = ref('');
const nextStatus = ref<TicketStatus | ''>('');
const busy = ref(false);
const error = ref('');

const internal = computed(() => props.staff && mode.value === 'note');
const statusChoices = computed(() => TRANSITIONS[props.status]);
const placeholder = computed(() =>
  internal.value ? 'Only your team can see internal notes' : 'Write your reply…',
);

async function submit() {
  if (!body.value.trim() || busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await props.send({
      body: body.value,
      internal: internal.value,
      ...(nextStatus.value && { status: nextStatus.value }),
    });
    body.value = '';
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form class="composer card" :class="{ internal }" @submit.prevent="submit">
    <div v-if="staff" class="tabs" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'reply'"
        :class="{ active: mode === 'reply' }"
        @click="mode = 'reply'"
      >
        Public reply
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'note'"
        :class="{ active: mode === 'note' }"
        @click="mode = 'note'"
      >
        Internal note
      </button>
    </div>

    <div class="card-body">
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <textarea v-model="body" :placeholder="placeholder" aria-label="Message" rows="5" />
      <div class="actions">
        <span class="spacer" />
        <select v-if="staff" v-model="nextStatus" class="inline" aria-label="Status after sending">
          <option value="">Keep status ({{ STATUS_LABELS[status] }})</option>
          <option v-for="s in statusChoices" :key="s" :value="s">
            Set {{ STATUS_LABELS[s].toLowerCase() }}
          </option>
        </select>
        <button type="submit" class="btn btn-primary" :disabled="busy || !body.trim()">
          {{ internal ? 'Add note' : 'Send reply' }}
        </button>
      </div>
    </div>
  </form>
</template>

<style scoped>
.composer.internal {
  background: var(--note);
  border-color: var(--note-border);
}

.tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px 0;
  border-bottom: 1px solid var(--border);
}

.tabs button[role='tab'] {
  border: none;
  background: none;
  font: inherit;
  font-weight: 500;
  color: var(--text-muted);
  padding: 8px 12px;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}

.tabs button.active {
  color: var(--text);
  border-bottom-color: var(--primary);
}

.internal .tabs button.active {
  border-bottom-color: var(--warning);
}

.canned {
  max-width: 240px;
  margin-bottom: 6px;
}

.actions {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
</style>
