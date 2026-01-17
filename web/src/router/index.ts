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

  // Customer portal
  {
    path: '/portal',
    name: 'portal',
    component: () => import('../views/portal/PortalHome.vue'),
    meta: { roles: ['customer'], title: 'Your requests' },
  },
  {
    path: '/portal/new',
    name: 'portal-new',
    component: () => import('../views/NewTicketView.vue'),
    meta: { roles: ['customer'], title: 'New request' },
  },
  {
    path: '/portal/tickets/:id(\\d+)',
    name: 'portal-ticket',
    component: () => import('../views/portal/PortalTicket.vue'),
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { roles: ['customer'], title: 'Request' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: { title: 'Not found' },
  },
];

export function createAppRouter() {
  const router = createRouter({ history: createWebHistory(), routes });

  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    await auth.load();
    if (to.name === 'home' || to.name === 'not-found') return true;
    return checkAccess(to.meta, auth.user, to.fullPath);
  });

  router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} · Helpdesk` : 'Helpdesk';
  });

  return router;
}
