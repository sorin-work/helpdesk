<script setup lang="ts">
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>

<template>
  <div class="page page-narrow empty">
    <h1>Page not found</h1>
    <p>The page you are looking for does not exist or has moved.</p>
    <RouterLink :to="auth.user ? auth.homePath : '/login'" class="btn">Go back home</RouterLink>
  </div>
</template>
