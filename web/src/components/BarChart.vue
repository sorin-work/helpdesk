<script setup lang="ts">
import { computed } from 'vue';

interface Series {
  key: string;
  label: string;
  color: string;
}

const props = defineProps<{
  data: Record<string, number | string>[];
  labelKey: string;
  series: Series[];
  height?: number;
}>();

const height = computed(() => props.height ?? 180);
const max = computed(() => {
  const values = props.data.flatMap((row) => props.series.map((s) => Number(row[s.key]) || 0));
  return Math.max(1, ...values);
});
const groupWidth = computed(() => 100 / Math.max(1, props.data.length));
const barWidth = computed(() => (groupWidth.value * 0.8) / props.series.length);
// Label every nth bar so long ranges stay readable.
const labelEvery = computed(() => Math.max(1, Math.ceil(props.data.length / 10)));

function barHeight(value: unknown) {
  return ((Number(value) || 0) / max.value) * (height.value - 20);
}
</script>

<template>
  <figure class="chart">
    <svg :viewBox="`0 0 100 ${height}`" preserveAspectRatio="none" role="img" :height="height">
      <title>{{ series.map((s) => s.label).join(' and ') }}</title>
      <g v-for="(row, i) in data" :key="String(row[labelKey])">
        <rect
          v-for="(s, j) in series"
          :key="s.key"
          :x="i * groupWidth + groupWidth * 0.1 + j * barWidth"
          :y="height - 20 - barHeight(row[s.key])"
          :width="barWidth"
          :height="barHeight(row[s.key])"
          :fill="s.color"
        >
          <title>{{ row[labelKey] }}: {{ row[s.key] }} {{ s.label.toLowerCase() }}</title>
        </rect>
      </g>
    </svg>
    <div class="labels">
      <span
        v-for="(row, i) in data"
        :key="String(row[labelKey])"
        :style="{ width: `${groupWidth}%` }"
      >
        {{ i % labelEvery === 0 ? String(row[labelKey]).slice(5) : '' }}
      </span>
    </div>
  </figure>
</template>

<style scoped>
.chart {
  margin: 0;
}

svg {
  width: 100%;
  display: block;
}

.labels {
  display: flex;
  font-size: 11px;
  color: var(--text-faint);
  margin-top: -16px;
}

.labels span {
  text-align: center;
  overflow: hidden;
}
</style>
