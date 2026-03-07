<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { api, ApiError, errorMessage } from '../../api/client';
import type { Role, User } from '../../api/types';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toasts';
import { formatDate } from '../../utils/format';

const auth = useAuthStore();
const toasts = useToastStore();

const users = ref<User[]>([]);
const role = ref<Role | ''>('');
const q = ref('');
const showInvite = ref(false);
const invite = reactive({ name: '', email: '', password: '', role: 'agent' as Role });
const inviteErrors = ref<Record<string, string>>({});

const ROLE_LABELS: Record<Role, string> = { customer: 'Customer', agent: 'Agent', admin: 'Admin' };

async function load() {
  users.value = (
    await api.get<{ items: User[] }>('/users', {
      role: role.value,
      q: q.value.trim(),
    })
  ).items;
}

let debounce: ReturnType<typeof setTimeout> | undefined;
watch(q, () => {
  clearTimeout(debounce);
  debounce = setTimeout(load, 250);
});
watch(role, load);
onMounted(load);

async function change(user: User, changes: Partial<Pick<User, 'role' | 'active'>>) {
  try {
    await api.patch(`/users/${user.id}`, changes);
    toasts.success(`${user.name} updated`);
  } catch (err) {
    toasts.error(errorMessage(err));
  }
  await load();
}

async function submitInvite() {
  inviteErrors.value = {};
  try {
    await api.post('/users', invite);
    toasts.success(`${invite.name} can now sign in`);
    Object.assign(invite, { name: '', email: '', password: '', role: 'agent' });
    showInvite.value = false;
    await load();
  } catch (err) {
    if (err instanceof ApiError && err.details.length) inviteErrors.value = err.fieldErrors();
    else inviteErrors.value = { form: errorMessage(err) };
  }
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1>People</h1>
      <button type="button" class="btn btn-primary" @click="showInvite = !showInvite">
        Add team member
      </button>
    </div>

    <form v-if="showInvite" class="card invite" @submit.prevent="submitInvite">
      <div class="card-body">
        <h2>Add a team member</h2>
        <p class="muted">
          Share the temporary password with them; they can change it after signing in.
        </p>
        <div v-if="inviteErrors.form" class="alert alert-error">{{ inviteErrors.form }}</div>
        <div class="grid-4">
          <div>
            <label for="invite-name">Name</label>
            <input id="invite-name" v-model="invite.name" type="text" required />
            <div v-if="inviteErrors.name" class="field-error">{{ inviteErrors.name }}</div>
          </div>
          <div>
            <label for="invite-email">Email</label>
            <input id="invite-email" v-model="invite.email" type="email" required />
            <div v-if="inviteErrors.email" class="field-error">{{ inviteErrors.email }}</div>
          </div>
          <div>
            <label for="invite-password">Temporary password</label>
            <input
              id="invite-password"
              v-model="invite.password"
              type="text"
              minlength="8"
              required
            />
            <div v-if="inviteErrors.password" class="field-error">{{ inviteErrors.password }}</div>
          </div>
          <div>
            <label for="invite-role">Role</label>
            <select id="invite-role" v-model="invite.role">
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div class="field row">
          <span class="spacer" />
          <button type="submit" class="btn btn-primary">Add</button>
        </div>
      </div>
    </form>

    <div class="row filters">
      <input
        v-model="q"
        type="search"
        class="inline"
        placeholder="Name or email"
        aria-label="Search people"
      />
      <select v-model="role" class="inline" aria-label="Role">
        <option value="">Everyone</option>
        <option value="admin">Admins</option>
        <option value="agent">Agents</option>
        <option value="customer">Customers</option>
      </select>
    </div>

    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th class="hide-mobile">Joined</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" :class="{ inactive: !user.active }">
            <td>
              {{ user.name }}
              <span v-if="!user.active" class="badge">Deactivated</span>
              <span v-else-if="user.role !== 'customer' && !user.available" class="badge"
                >Away</span
              >
            </td>
            <td class="muted">{{ user.email }}</td>
            <td>
              <select
                class="inline"
                :value="user.role"
                :disabled="user.id === auth.user?.id"
                :aria-label="`Role for ${user.name}`"
                @change="change(user, { role: ($event.target as HTMLSelectElement).value as Role })"
              >
                <option v-for="(label, key) in ROLE_LABELS" :key="key" :value="key">
                  {{ label }}
                </option>
              </select>
            </td>
            <td class="hide-mobile muted">{{ formatDate(user.createdAt) }}</td>
            <td class="num">
              <button
                v-if="user.id !== auth.user?.id"
                type="button"
                class="btn btn-small"
                :class="{ 'btn-danger': user.active }"
                @click="change(user, { active: !user.active })"
              >
                {{ user.active ? 'Deactivate' : 'Reactivate' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="users.length === 0" class="empty">Nobody matches.</div>
    </div>
  </div>
</template>

<style scoped>
.invite {
  margin-bottom: 16px;
}

.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.filters {
  margin-bottom: 12px;
}

.filters input[type='search'] {
  width: 240px;
}

.inactive td {
  color: var(--text-faint);
}

@media (max-width: 860px) {
  .grid-4 {
    grid-template-columns: 1fr;
  }
}
</style>
