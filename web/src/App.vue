<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import ToastHost from './components/ToastHost.vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
const route = useRoute();
const showHeader = computed(() => auth.user !== null && !route.meta.guest);
</script>

<template>
  <AppHeader v-if="showHeader" />
  <main>
    <RouterView />
  </main>
  <ToastHost />
</template>
