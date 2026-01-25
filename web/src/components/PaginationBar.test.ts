import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PaginationBar from './PaginationBar.vue';

describe('PaginationBar', () => {
  it('shows the range and disables buttons at the ends', () => {
    const wrapper = mount(PaginationBar, { props: { page: 1, pageSize: 25, total: 60 } });
    expect(wrapper.text()).toContain('1–25 of 60');
    const [prev, next] = wrapper.findAll('button');
    expect(prev!.attributes('disabled')).toBeDefined();
    expect(next!.attributes('disabled')).toBeUndefined();
  });

  it('emits the next page', async () => {
    const wrapper = mount(PaginationBar, { props: { page: 3, pageSize: 25, total: 60 } });
    expect(wrapper.text()).toContain('51–60 of 60');
    await wrapper.findAll('button')[0]!.trigger('click');
    expect(wrapper.emitted('change')).toEqual([[2]]);
  });

  it('shows an empty range for an empty list', () => {
    const wrapper = mount(PaginationBar, { props: { page: 1, pageSize: 25, total: 0 } });
    expect(wrapper.text()).toContain('0–0 of 0');
  });
});
