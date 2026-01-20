import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { mockFetch } from '../test/fetch';
import LoginView from './LoginView.vue';

const Stub = { template: '<div />' };

async function setup(path = '/login') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/portal', component: Stub },
      { path: '/queue/mine', component: Stub },
      { path: '/tickets/:id', component: Stub },
      { path: '/signup', component: Stub },
    ],
  });
  await router.push(path);
  const wrapper = mount(LoginView, { global: { plugins: [router] } });
  return { wrapper, router };
}

async function fill(wrapper: Awaited<ReturnType<typeof setup>>['wrapper']) {
  await wrapper.find('#email').setValue('agent@example.com');
  await wrapper.find('#password').setValue('agent-password');
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

beforeEach(() => setActivePinia(createPinia()));

describe('LoginView', () => {
  it('sends agents to their queue', async () => {
    mockFetch({ 'POST /api/auth/login': { body: { id: 2, name: 'Alex', role: 'agent' } } });
    const { wrapper, router } = await setup();
    await fill(wrapper);
    expect(router.currentRoute.value.path).toBe('/queue/mine');
  });

  it('follows a local redirect', async () => {
    mockFetch({ 'POST /api/auth/login': { body: { id: 2, name: 'Alex', role: 'agent' } } });
    const { wrapper, router } = await setup('/login?redirect=/tickets/1001');
    await fill(wrapper);
    expect(router.currentRoute.value.path).toBe('/tickets/1001');
  });

  it('ignores redirects to other sites', async () => {
    mockFetch({ 'POST /api/auth/login': { body: { id: 3, name: 'Casey', role: 'customer' } } });
    const { wrapper, router } = await setup('/login?redirect=//evil.example');
    await fill(wrapper);
    expect(router.currentRoute.value.path).toBe('/portal');
  });

  it('shows the error from the API', async () => {
    mockFetch({
      'POST /api/auth/login': {
        status: 401,
        body: { error: { code: 'unauthorized', message: 'Email or password is incorrect' } },
      },
    });
    const { wrapper, router } = await setup();
    await fill(wrapper);
    expect(wrapper.find('[role="alert"]').text()).toBe('Email or password is incorrect');
    expect(router.currentRoute.value.path).toBe('/login');
  });
});
