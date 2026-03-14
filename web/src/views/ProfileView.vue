<script setup lang="ts">
import { ref } from 'vue';
import { api, errorMessage } from '../api/client';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toasts';

const auth = useAuthStore();
const toasts = useToastStore();

const name = ref(auth.user?.name ?? '');
const currentPassword = ref('');
const newPassword = ref('');
const passwordError = ref('');

async function saveName() {
  try {
    await auth.updateProfile({ name: name.value });
    toasts.success('Profile saved');
  } catch (err) {
    toasts.error(errorMessage(err));
  }
}

async function toggleAvailability() {
  try {
    await auth.updateProfile({ available: !auth.user?.available });
    toasts.success(auth.user?.available ? 'You are available for new tickets' : 'You are away');
  } catch (err) {
    toasts.error(errorMessage(err));
  }
}

async function changePassword() {
  passwordError.value = '';
  try {
    await api.post('/auth/password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    currentPassword.value = '';
    newPassword.value = '';
    toasts.success('Password changed');
  } catch (err) {
    passwordError.value = errorMessage(err);
  }
}
</script>

<template>
  <div class="page page-narrow">
    <div class="page-header"><h1>Your profile</h1></div>

    <form class="card" @submit.prevent="saveName">
      <div class="card-body">
        <h2>Details</h2>
        <div class="field">
          <label for="name">Name</label>
          <input id="name" v-model="name" type="text" required />
        </div>
        <div class="field">
          <label>Email</label>
          <div class="muted">{{ auth.user?.email }}</div>
        </div>
        <div class="field"><button type="submit" class="btn btn-primary">Save</button></div>
      </div>
    </form>

    <div v-if="auth.isStaff" class="card">
      <div class="card-body row">
        <div>
          <h2>Availability</h2>
          <p class="muted">
            When you are away, round-robin assignment skips you. Tickets you already have stay with
            you.
          </p>
        </div>
        <span class="spacer" />
        <button type="button" class="btn" @click="toggleAvailability">
          {{ auth.user?.available ? 'Set as away' : 'Set as available' }}
        </button>
      </div>
    </div>

    <form class="card" @submit.prevent="changePassword">
      <div class="card-body">
        <h2>Change password</h2>
        <div v-if="passwordError" class="alert alert-error">{{ passwordError }}</div>
        <div class="field">
          <label for="current">Current password</label>
          <input
            id="current"
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>
        <div class="field">
          <label for="new">New password</label>
          <input
            id="new"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
          />
        </div>
        <div class="field"><button type="submit" class="btn">Change password</button></div>
      </div>
    </form>
  </div>
</template>
