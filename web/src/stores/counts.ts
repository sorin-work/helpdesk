import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/client';
import type { ViewCounts } from '../api/types';

/** Sidebar counts for the agent views. Refreshed after changes and on a timer. */
export const useCountsStore = defineStore('counts', () => {
  const counts = ref<ViewCounts>({ unassigned: 0, mine: 0, open: 0, overdue: 0 });

  async function refresh() {
    try {
      counts.value = await api.get<ViewCounts>('/tickets/counts');
    } catch {
      // Counts are a nicety; keep the old numbers if the request fails.
    }
  }

  return { counts, refresh };
});
