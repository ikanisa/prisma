import { describe, expect, it } from 'vitest';
import { getAssistantChips, systemConfig } from '@/lib/system-config';

describe('system-config', () => {
  it('parses system metadata', () => {
    expect(systemConfig.meta?.name).toBe('Autonomous Finance Suite');
  });

  it('returns configured chips for known routes', () => {
    const chips = getAssistantChips('/documents');
    expect(chips).toContain('Summarize document');
  });

  it('falls back to defaults when route missing', () => {
    const chips = getAssistantChips('/unknown-path');
    expect(Array.isArray(chips)).toBe(true);
  });
});
