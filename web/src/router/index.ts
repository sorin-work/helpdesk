import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { checkAccess, homeFor, type AccessMeta } from './guards';

declare module 'vue-router' {
  interface RouteMeta extends AccessMeta {
    title?: string;
  }
}

const staff = ['agent', 'admin'] as const;

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
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { title: 'Your profile' },
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

  // Agent workspace
  {
    path: '/queue/:view(unassigned|mine|open|overdue|solved|all)?',
    name: 'queue',
    component: () => import('../views/agent/QueueView.vue'),
    props: (route) => ({ view: route.params.view || 'mine' }),
    meta: { roles: [...staff], title: 'Tickets' },
  },
  {
    path: '/tickets/new',
    name: 'ticket-new',
    component: () => import('../views/NewTicketView.vue'),
    meta: { roles: [...staff], title: 'New ticket' },
  },
  {
    path: '/tickets/:id(\\d+)',
    name: 'ticket',
    component: () => import('../views/agent/TicketView.vue'),
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { roles: [...staff], title: 'Ticket' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('../views/SearchView.vue'),
    meta: { title: 'Search' },
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('../views/agent/ReportsView.vue'),
    meta: { roles: [...staff], title: 'Reports' },
  },
  {
    path: '/canned-responses',
    name: 'canned',
    component: () => import('../views/agent/CannedResponsesView.vue'),
    meta: { roles: [...staff], title: 'Canned responses' },
  },
  {
    path: '/admin/users',
    name: 'users',
    component: () => import('../views/admin/UsersView.vue'),
    meta: { roles: ['admin'], title: 'Team and customers' },
  },
  {
    path: '/admin/settings',
    name: 'settings',
    component: () => import('../views/admin/SettingsView.vue'),
    meta: { roles: ['admin'], title: 'Settings' },
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
