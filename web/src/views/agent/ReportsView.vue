<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { api, errorMessage } from '../../api/client';
import type { ReportOverview } from '../../api/types';
import BarChart from '../../components/BarChart.vue';
import { daysAgo, formatDuration, formatPercent, isoDate } from '../../utils/format';

const from = ref(isoDate(daysAgo(29)));
const to = ref(isoDate(new Date()));
const report = ref<ReportOverview | null>(null);
const error = ref('');
const loading = ref(false);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    report.value = await api.get<ReportOverview>('/reports/overview', {
      from: from.value,
      to: to.value,
    });
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    loading.value = false;
  }
}

watch([from, to], load);
onMounted(load);

function rateClass(rate: number | null) {
  if (rate === null) return '';
  if (rate >= 0.9) return 'good';
  if (rate >= 0.75) return 'ok';
  return 'bad';
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1>Reports</h1>
      <div class="row">
        <input v-model="from" type="date" class="inline" aria-label="From" />
        <span class="muted">to</span>
        <input v-model="to" type="date" class="inline" aria-label="To" />
      </div>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <template v-if="report">
      <div class="stats">
        <div class="card stat">
          <span class="label">Tickets created</span>
          <strong>{{ report.totals.created }}</strong>
          <span class="faint">{{ report.totals.solved }} of them solved</span>
        </div>
        <div class="card stat">
          <span class="label">Open backlog</span>
          <strong>{{ report.totals.backlog }}</strong>
          <span class="faint">unsolved right now</span>
        </div>
        <div class="card stat">
          <span class="label">First response (median)</span>
          <strong>{{ formatDuration(report.firstResponse.medianMinutes) }}</strong>
          <span class="faint">avg {{ formatDuration(report.firstResponse.averageMinutes) }}</span>
        </div>
        <div class="card stat">
          <span class="label">Resolution (median)</span>
          <strong>{{ formatDuration(report.resolution.medianMinutes) }}</strong>
          <span class="faint">avg {{ formatDuration(report.resolution.averageMinutes) }}</span>
        </div>
        <div class="card stat">
          <span class="label">First response SLA</span>
          <strong :class="rateClass(report.sla.firstResponse.rate)">
            {{ formatPercent(report.sla.firstResponse.rate) }}
          </strong>
          <span class="faint">{{ report.sla.firstResponse.breached }} breached</span>
        </div>
        <div class="card stat">
          <span class="label">Resolution SLA</span>
          <strong :class="rateClass(report.sla.resolution.rate)">
            {{ formatPercent(report.sla.resolution.rate) }}
          </strong>
          <span class="faint">{{ report.sla.resolution.breached }} breached</span>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h2>Ticket volume</h2>
          <BarChart
            :data="report.volume"
            label-key="date"
            :series="[
              { key: 'created', label: 'Created', color: '#2f5bea' },
              { key: 'solved', label: 'Solved', color: '#1d8a4e' },
            ]"
          />
        </div>
      </div>

      <p class="faint footnote">
        Durations are in business hours ({{ report.range.timezone }}) unless the priority runs 24/7.
        Response times and SLA figures cover tickets created in the selected period.
      </p>
    </template>
    <div v-else-if="loading" class="muted">Loading…</div>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
}

.stat + .stat {
  margin-top: 0;
}

.stat .label {
  font-size: 12px;
  color: var(--text-muted);
}

.stat strong {
  font-size: 26px;
  line-height: 1.3;
}

.footnote {
  margin-top: 12px;
}

.good {
  color: var(--success);
}

.ok {
  color: var(--warning);
}

.bad {
  color: var(--danger);
}
</style>
