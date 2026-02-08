import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TagInput from './TagInput.vue';

function setup(tags: string[] = []) {
  return mount(TagInput, { props: { modelValue: tags } });
}

describe('TagInput', () => {
  it('adds a normalized tag on enter', async () => {
    const wrapper = setup(['billing']);
    const input = wrapper.find('input');
    await input.setValue('  VIP Customer ');
    await input.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('update:modelValue')).toEqual([[['billing', 'vip-customer']]]);
    expect((input.element as HTMLInputElement).value).toBe('');
  });

  it('removes tags with the button or backspace', async () => {
    const wrapper = setup(['billing', 'refund']);
    await wrapper.find('button[aria-label="Remove billing"]').trigger('click');
    await wrapper.find('input').trigger('keydown', { key: 'Backspace' });
    expect(wrapper.emitted('update:modelValue')).toEqual([[['refund']], [['billing']]]);
  });
});
