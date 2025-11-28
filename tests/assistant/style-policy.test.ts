import { describe, expect, it, vi } from 'vitest';
import { validateAssistantResponseStyle } from '@/lib/assistant-style-policy';
import * as clientEvents from '@/lib/client-events';

describe('assistant-style-policy', () => {
  it('flags violations when assistant omits suggested actions', () => {
    const spy = vi.spyOn(clientEvents, 'recordClientEvent').mockImplementation(() => {});
    const violations = validateAssistantResponseStyle({
      actions: [{ label: 'Only one' }],
      messages: [{ role: 'assistant', content: 'Brief summary.' }],
    });
    expect(violations).toContain('assistant.style.missing_next_two_actions');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('passes when style guidance satisfied', () => {
    const spy = vi.spyOn(clientEvents, 'recordClientEvent').mockImplementation(() => {});
    const violations = validateAssistantResponseStyle({
      actions: [
        { label: 'First action' },
        { label: 'Second action' },
      ],
      messages: [{ role: 'assistant', content: 'All clear.' }],
    });
    expect(violations).toHaveLength(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
