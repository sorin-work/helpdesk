<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { initials } from '../utils/format';

const auth = useAuthStore();
const router = useRouter();
async function logout() {
  await auth.logout();
  router.push('/login');
}
</script>

<template>
  <header class="app-header">
    <RouterLink :to="auth.homePath" class="brand">
      <img src="/favicon.svg" alt="" width="24" height="24" />
      <span>Helpdesk</span>
    </RouterLink>

    <nav v-if="auth.isStaff" class="nav">
      <RouterLink to="/queue/mine" :class="{ active: $route.name === 'queue' }">Tickets</RouterLink>
      <RouterLink to="/canned-responses">Canned responses</RouterLink>
      <template v-if="auth.isAdmin">
        <RouterLink to="/admin/users">People</RouterLink>
        <RouterLink to="/admin/settings">Settings</RouterLink>
      </template>
    </nav>
    <nav v-else class="nav">
      <RouterLink to="/portal">My requests</RouterLink>
      <RouterLink to="/portal/new">New request</RouterLink>
    </nav>

    <div class="user">
      <span class="avatar" :title="auth.user?.name">{{ initials(auth.user?.name ?? '') }}</span>
      <button type="button" class="btn btn-small" @click="logout">Sign out</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 24px;
  height: 56px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 16px;
  color: var(--text);
}

.brand:hover {
  text-decoration: none;
}

.nav {
  display: flex;
  gap: 4px;
}

.nav a {
  color: var(--text-muted);
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: 500;
}

.nav a:hover {
  background: var(--surface-muted);
  text-decoration: none;
}

.nav a.router-link-active,
.nav a.active {
  color: var(--primary);
  background: var(--primary-soft);
}

.search {
  flex: 1;
  max-width: 320px;
  margin-left: auto;
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary-hover);
  font-weight: 600;
  font-size: 13px;
}

.avatar:hover {
  text-decoration: none;
}

@media (max-width: 860px) {
  .app-header {
    gap: 12px;
    padding: 0 12px;
    overflow-x: auto;
  }

  .brand span {
    display: none;
  }
}
</style>
