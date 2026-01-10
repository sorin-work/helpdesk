<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { errorMessage } from '../api/client';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await auth.login(email.value, password.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;
    await router.push(redirect ?? auth.homePath);
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <form class="card auth-card" @submit.prevent="submit">
      <div class="card-body">
        <img src="/favicon.svg" alt="" width="40" height="40" />
        <h1>Sign in to Helpdesk</h1>
        <div v-if="error" class="alert alert-error" role="alert">{{ error }}</div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" autocomplete="email" required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary wide" :disabled="busy">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
        <p class="muted switch">
          Need help with something?
          <RouterLink to="/signup">Create a customer account</RouterLink>
        </p>
      </div>
    </form>
  </div>
</template>

<style>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.auth-card {
  width: 100%;
  max-width: 380px;
}

.auth-card h1 {
  margin: 12px 0 20px;
}

.auth-card .wide {
  width: 100%;
  margin-top: 20px;
}

.auth-card .switch {
  margin: 16px 0 0;
  text-align: center;
}
</style>
