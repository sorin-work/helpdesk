import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api, ApiError } from '../api/client';
import type { User } from '../api/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loaded = ref(false);
  let pending: Promise<void> | null = null;

  const isStaff = computed(() => user.value?.role === 'agent' || user.value?.role === 'admin');
  const isAdmin = computed(() => user.value?.role === 'admin');
  const homePath = computed(() => (isStaff.value ? '/queue/mine' : '/portal'));

  /** Loads the session once; later calls reuse the result. */
  function load(): Promise<void> {
    if (loaded.value) return Promise.resolve();
    pending ??= api
      .get<User>('/auth/me')
      .then((me) => {
        user.value = me;
      })
      .catch((err) => {
        if (!(err instanceof ApiError) || err.status !== 401) throw err;
        user.value = null;
      })
      .finally(() => {
        loaded.value = true;
        pending = null;
      });
    return pending;
  }

  async function login(email: string, password: string) {
    user.value = await api.post<User>('/auth/login', { email, password });
    loaded.value = true;
  }

  async function signup(name: string, email: string, password: string) {
    user.value = await api.post<User>('/auth/signup', { name, email, password });
    loaded.value = true;
  }

  async function logout() {
    await api.post('/auth/logout');
    user.value = null;
  }

  async function updateProfile(changes: { name?: string; available?: boolean }) {
    user.value = await api.patch<User>('/auth/me', changes);
  }

  /** Called when any request comes back 401, e.g. after the session expired. */
  function sessionExpired() {
    user.value = null;
  }

  return {
    user,
    loaded,
    isStaff,
    isAdmin,
    homePath,
    load,
    login,
    signup,
    logout,
    updateProfile,
    sessionExpired,
  };
});
