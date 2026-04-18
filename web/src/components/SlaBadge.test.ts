import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SlaBadge from './SlaBadge.vue';

const now = new Date('2026-03-04T10:00:00Z');

describe('SlaBadge', () => {
  it('counts down to the target', () => {
    const wrapper = mount(SlaBadge, {
      props: { clock: { state: 'on_track', dueAt: '2026-03-04T13:00:00Z' }, now },
    });
    expect(wrapper.text()).toBe('Due in 3h');
    expect(wrapper.classes()).toContain('sla-on_track');
  });

  it('highlights breaches', () => {
    const wrapper = mount(SlaBadge, {
      props: {
        clock: { state: 'breached', dueAt: '2026-03-04T09:00:00Z' },
        label: 'First response',
        now,
      },
    });
    expect(wrapper.text()).toBe('First response Overdue');
    expect(wrapper.classes()).toContain('sla-breached');
    expect(wrapper.attributes('title')).toMatch(/^First response: Breached, due /);
  });

  it('shows met and paused clocks without a countdown', () => {
    expect(
      mount(SlaBadge, { props: { clock: { state: 'met', dueAt: '2026-03-04T09:00:00Z' } } }).text(),
    ).toBe('Met');
    expect(
      mount(SlaBadge, {
        props: { clock: { state: 'paused', dueAt: '2026-03-04T09:00:00Z' } },
      }).text(),
    ).toBe('Paused');
  });

  it('handles tickets without a target', () => {
    expect(mount(SlaBadge, { props: { clock: { state: 'none', dueAt: null } } }).text()).toBe(
      'No target',
    );
  });
});
