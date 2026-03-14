<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, ApiError, errorMessage } from '../../api/client';
import type { BusinessSchedule, SlaPolicies, TicketPriority, Weekday } from '../../api/types';
import { useToastStore } from '../../stores/toasts';
import { PRIORITY_LABELS } from '../../utils/format';

const toasts = useToastStore();

const DAYS: { key: Weekday; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];
const PRIORITIES: TicketPriority[] = ['urgent', 'high', 'normal', 'low'];

const timezones = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC'];
  }
})();

interface DayRow {
  enabled: boolean;
  start: string;
  end: string;
}

const timezone = ref('UTC');
const days = ref<Record<Weekday, DayRow>>(
  Object.fromEntries(
    DAYS.map((d) => [d.key, { enabled: false, start: '09:00', end: '17:00' }]),
  ) as Record<Weekday, DayRow>,
);
const holidays = ref<string[]>([]);
const newHoliday = ref('');
const scheduleError = ref('');

/** SLA targets are edited in hours; the API stores minutes. */
const policies = ref<
  Record<TicketPriority, { first: number; resolution: number; businessHours: boolean }>
>({} as never);
const slaError = ref('');
const autoAssign = ref(false);

function fromSchedule(schedule: BusinessSchedule) {
  timezone.value = schedule.timezone;
  for (const { key } of DAYS) {
    const hours = schedule.days[key];
    days.value[key] = hours
      ? { enabled: true, start: hours.start, end: hours.end }
      : { ...days.value[key], enabled: false };
  }
  holidays.value = [...schedule.holidays];
}

function fromPolicies(next: SlaPolicies) {
  policies.value = Object.fromEntries(
    PRIORITIES.map((p) => [
      p,
      {
        first: next[p].firstResponseMinutes / 60,
        resolution: next[p].resolutionMinutes / 60,
        businessHours: next[p].businessHours,
      },
    ]),
  ) as typeof policies.value;
}

onMounted(async () => {
  const [schedule, sla, assignment] = await Promise.all([
    api.get<BusinessSchedule>('/settings/business-hours'),
    api.get<SlaPolicies>('/settings/sla'),
    api.get<{ autoAssign: boolean }>('/settings/assignment'),
  ]);
  fromSchedule(schedule);
  fromPolicies(sla);
  autoAssign.value = assignment.autoAssign;
});

function addHoliday() {
  if (newHoliday.value && !holidays.value.includes(newHoliday.value)) {
    holidays.value = [...holidays.value, newHoliday.value].sort();
  }
  newHoliday.value = '';
}

function describe(err: unknown): string {
  if (err instanceof ApiError && err.details.length) {
    return err.details.map((d) => `${d.path}: ${d.message}`).join('; ');
  }
  return errorMessage(err);
}

async function saveSchedule() {
  scheduleError.value = '';
  try {
    const saved = await api.put<BusinessSchedule>('/settings/business-hours', {
      timezone: timezone.value,
      days: Object.fromEntries(
        DAYS.map(({ key }) => {
          const row = days.value[key];
          return [key, row.enabled ? { start: row.start, end: row.end } : null];
        }),
      ),
      holidays: holidays.value,
    });
    fromSchedule(saved);
    toasts.success('Business hours saved');
  } catch (err) {
    scheduleError.value = describe(err);
  }
}

async function saveSla() {
  slaError.value = '';
  try {
    const saved = await api.put<SlaPolicies>(
      '/settings/sla',
      Object.fromEntries(
        PRIORITIES.map((p) => [
          p,
          {
            firstResponseMinutes: Math.round(policies.value[p].first * 60),
            resolutionMinutes: Math.round(policies.value[p].resolution * 60),
            businessHours: policies.value[p].businessHours,
          },
        ]),
      ),
    );
    fromPolicies(saved);
    toasts.success('SLA targets saved. They apply to new tickets and priority changes.');
  } catch (err) {
    slaError.value = describe(err);
  }
}

async function saveAssignment() {
  try {
    await api.put('/settings/assignment', { autoAssign: autoAssign.value });
    toasts.success(
      autoAssign.value ? 'Round-robin assignment is on' : 'Round-robin assignment is off',
    );
  } catch (err) {
    toasts.error(errorMessage(err));
  }
}
</script>

<template>
  <div class="page page-narrow">
    <div class="page-header"><h1>Settings</h1></div>

    <form class="card" @submit.prevent="saveSchedule">
      <div class="card-body">
        <h2>Business hours</h2>
        <p class="muted">
          SLA targets only count down during these hours, unless a priority runs 24/7.
        </p>
        <div v-if="scheduleError" class="alert alert-error">{{ scheduleError }}</div>

        <div class="field">
          <label for="tz">Time zone</label>
          <select id="tz" v-model="timezone">
            <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
          </select>
        </div>

        <table class="table days">
          <tbody>
            <tr v-for="d in DAYS" :key="d.key">
              <td>
                <label class="checkbox">
                  <input v-model="days[d.key].enabled" type="checkbox" /> {{ d.label }}
                </label>
              </td>
              <td>
                <div v-if="days[d.key].enabled" class="row">
                  <input
                    v-model="days[d.key].start"
                    type="time"
                    class="inline"
                    :aria-label="`${d.label} opens`"
                  />
                  <span class="muted">to</span>
                  <input
                    v-model="days[d.key].end"
                    type="time"
                    class="inline"
                    :aria-label="`${d.label} closes`"
                  />
                </div>
                <span v-else class="faint">Closed</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="field">
          <label for="holiday">Holidays</label>
          <div class="row">
            <input id="holiday" v-model="newHoliday" type="date" class="inline" />
            <button type="button" class="btn btn-small" @click="addHoliday">Add</button>
          </div>
          <div class="row holidays">
            <span v-for="h in holidays" :key="h" class="tag">
              {{ h }}
              <button
                type="button"
                class="btn-link"
                :aria-label="`Remove ${h}`"
                @click="holidays = holidays.filter((x) => x !== h)"
              >
                ×
              </button>
            </span>
            <span v-if="holidays.length === 0" class="faint">No holidays.</span>
          </div>
        </div>

        <div class="field row">
          <span class="spacer" />
          <button type="submit" class="btn btn-primary">Save business hours</button>
        </div>
      </div>
    </form>

    <form class="card" @submit.prevent="saveSla">
      <div class="card-body">
        <h2>SLA targets</h2>
        <div v-if="slaError" class="alert alert-error">{{ slaError }}</div>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Priority</th>
            <th>First response (hours)</th>
            <th>Resolution (hours)</th>
            <th>Clock</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in PRIORITIES" :key="p">
            <template v-if="policies[p]">
              <td>{{ PRIORITY_LABELS[p] }}</td>
              <td>
                <input
                  v-model.number="policies[p].first"
                  type="number"
                  min="0.25"
                  step="0.25"
                  :aria-label="`${PRIORITY_LABELS[p]} first response hours`"
                />
              </td>
              <td>
                <input
                  v-model.number="policies[p].resolution"
                  type="number"
                  min="0.25"
                  step="0.25"
                  :aria-label="`${PRIORITY_LABELS[p]} resolution hours`"
                />
              </td>
              <td>
                <select
                  v-model="policies[p].businessHours"
                  :aria-label="`${PRIORITY_LABELS[p]} clock`"
                >
                  <option :value="true">Business hours</option>
                  <option :value="false">24/7</option>
                </select>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
      <div class="card-body row">
        <span class="spacer" />
        <button type="submit" class="btn btn-primary">Save SLA targets</button>
      </div>
    </form>

    <div class="card">
      <div class="card-body row">
        <div>
          <h2>Round-robin assignment</h2>
          <p class="muted">
            New tickets go to the next available agent in turn. Agents who set themselves as away
            are skipped.
          </p>
        </div>
        <span class="spacer" />
        <label class="checkbox">
          <input v-model="autoAssign" type="checkbox" @change="saveAssignment" />
          {{ autoAssign ? 'On' : 'Off' }}
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.days {
  margin: 8px 0 16px;
}

.days td {
  padding: 6px 0;
  border: none;
}

.days td:first-child {
  width: 160px;
}

.holidays {
  margin-top: 8px;
}
</style>
