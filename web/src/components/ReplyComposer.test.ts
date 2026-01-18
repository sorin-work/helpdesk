import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { ReplyPayload } from '../api/types';
import ReplyComposer from './ReplyComposer.vue';

function setup(props: Record<string, unknown> = {}) {
  const send = vi.fn<(payload: ReplyPayload) => Promise<void>>().mockResolvedValue();
  const wrapper = mount(ReplyComposer, {
    props: { ticketId: 1001, status: 'open', send, ...props },
  });
  return { wrapper, send };
}

describe('ReplyComposer', () => {
  it('sends a public reply and clears the form', async () => {
    const { wrapper, send } = setup();
    await wrapper.find('textarea').setValue('Thanks for waiting!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(send).toHaveBeenCalledWith({
      body: 'Thanks for waiting!',
      internal: false,
    });
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('');
  });

  it('does not offer notes or status changes to customers', () => {
    const { wrapper } = setup();
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('select[aria-label="Status after sending"]').exists()).toBe(false);
  });

  it('lets agents write internal notes', async () => {
    const { wrapper, send } = setup({ staff: true });
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click');
    expect(wrapper.find('button[type="submit"]').text()).toBe('Add note');
    await wrapper.find('textarea').setValue('Customer is on the old plan');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(send.mock.calls[0]![0]).toMatchObject({ internal: true });
  });

  it('only offers allowed next statuses and sends the chosen one', async () => {
    const { wrapper, send } = setup({ staff: true, status: 'pending' });
    const select = wrapper.find('select[aria-label="Status after sending"]');
    const options = select.findAll('option').map((o) => o.attributes('value'));
    expect(options).toEqual(['', 'open', 'on_hold', 'solved']);

    await select.setValue('solved');
    await wrapper.find('textarea').setValue('All fixed');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(send.mock.calls[0]![0]).toMatchObject({ status: 'solved' });
  });

  it('keeps the text and shows the error when sending fails', async () => {
    const { wrapper, send } = setup();
    send.mockRejectedValueOnce(new Error('This ticket is closed.'));
    await wrapper.find('textarea').setValue('Hello?');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('.alert-error').text()).toBe('This ticket is closed.');
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('Hello?');
  });

  it('does not send empty messages', async () => {
    const { wrapper, send } = setup();
    await wrapper.find('textarea').setValue('   ');
    await wrapper.find('form').trigger('submit');
    expect(send).not.toHaveBeenCalled();
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
  });
});
