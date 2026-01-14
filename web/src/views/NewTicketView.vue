<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, ApiError, errorMessage } from '../api/client';
import type { TicketDetail, TicketPriority } from '../api/types';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toasts';
import { PRIORITY_LABELS } from '../utils/format';

const auth = useAuthStore();
const router = useRouter();
const toasts = useToastStore();

const subject = ref('');
const body = ref('');
const priority = ref<TicketPriority>('normal');
const busy = ref(false);
const error = ref('');
const fieldErrors = ref<Record<string, string>>({});

const priorities: TicketPriority[] = ['low', 'normal', 'high'];

async function submit() {
  busy.value = true;
  error.value = '';
  fieldErrors.value = {};
  try {
    const ticket = await api.post<TicketDetail>('/tickets', {
      subject: subject.value,
      body: body.value,
      priority: priority.value,
    });
    toasts.success(`Ticket #${ticket.id} created`);
    await router.push(`/portal/tickets/${ticket.id}`);
  } catch (err) {
    if (err instanceof ApiError && err.details.length) fieldErrors.value = err.fieldErrors();
    else error.value = errorMessage(err);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="page page-narrow">
    <div class="page-header">
      <h1>How can we help?</h1>
    </div>
    <form class="card" @submit.prevent="submit">
      <div class="card-body">
        <div v-if="error" class="alert alert-error" role="alert">{{ error }}</div>

        <div class="field">
          <label for="subject">Subject</label>
          <input
            id="subject"
            v-model="subject"
            type="text"
            maxlength="200"
            placeholder="A short summary of the problem"
            required
          />
          <div v-if="fieldErrors.subject" class="field-error">{{ fieldErrors.subject }}</div>
        </div>

        <div class="field">
          <label for="body">Description</label>
          <textarea
            id="body"
            v-model="body"
            rows="8"
            placeholder="What happened, what you expected, and any steps to reproduce it"
            required
          />
          <div v-if="fieldErrors.body" class="field-error">{{ fieldErrors.body }}</div>
        </div>

        <div class="grid-2 field">
          <div>
            <label for="priority">How urgent is it?</label>
            <select id="priority" v-model="priority">
              <option v-for="p in priorities" :key="p" :value="p">{{ PRIORITY_LABELS[p] }}</option>
            </select>
          </div>
        </div>

        <div class="field row">
          <span class="spacer" />
          <RouterLink :to="auth.homePath" class="btn">Cancel</RouterLink>
          <button type="submit" class="btn btn-primary" :disabled="busy">
            {{ busy ? 'Submitting…' : 'Submit' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
