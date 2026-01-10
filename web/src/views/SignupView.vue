<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { errorMessage } from '../api/client';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    await auth.signup(name.value, email.value, password.value);
    await router.push('/portal');
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
        <h1>Create an account</h1>
        <p class="muted">Open requests and follow their progress in one place.</p>
        <div v-if="error" class="alert alert-error" role="alert">{{ error }}</div>
        <div class="field">
          <label for="name">Your name</label>
          <input id="name" v-model="name" type="text" autocomplete="name" required />
        </div>
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
            autocomplete="new-password"
            minlength="8"
            required
          />
          <div class="faint">At least 8 characters.</div>
        </div>
        <button type="submit" class="btn btn-primary wide" :disabled="busy">
          {{ busy ? 'Creating account…' : 'Create account' }}
        </button>
        <p class="muted switch">
          Already have an account? <RouterLink to="/login">Sign in</RouterLink>
        </p>
      </div>
    </form>
  </div>
</template>
