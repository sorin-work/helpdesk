import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { checkAccess, homeFor, type AccessMeta } from './guards';

declare module 'vue-router' {
  interface RouteMeta extends AccessMeta {
    title?: string;
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: { render: () => null },
    beforeEnter: () => {
      const auth = useAuthStore();
      return auth.user ? homeFor(auth.user) : '/login';
    },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true, title: 'Sign in' },
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('../views/SignupView.vue'),
    meta: { guest: true, title: 'Create an account' },
  },
];

export function createAppRouter() {
  const router = createRouter({ history: createWebHistory(), routes });

  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    await auth.load();
    if (to.name === 'home') return true;
    return checkAccess(to.meta, auth.user, to.fullPath);
  });

  return router;
}
