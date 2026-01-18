import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PriorityBadge from './PriorityBadge.vue';
import StatusBadge from './StatusBadge.vue';

describe('StatusBadge', () => {
  it('shows a readable label', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'on_hold' } });
    expect(wrapper.text()).toBe('On hold');
    expect(wrapper.classes()).toContain('status-on_hold');
  });
});

describe('PriorityBadge', () => {
  it('shows the priority', () => {
    const wrapper = mount(PriorityBadge, { props: { priority: 'urgent' } });
    expect(wrapper.text()).toBe('Urgent');
    expect(wrapper.classes()).toContain('priority-urgent');
  });
});
