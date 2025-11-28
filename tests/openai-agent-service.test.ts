import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('OPENAI_AGENT_PLATFORM_ENABLED', 'true');
vi.stubEnv('OPENAI_AGENT_ID', 'agent_test');

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { buildOpenAiToolDefinition, syncAgentToolsFromRegistry } from '../services/rag/openai-agent-service';

describe('openai-agent-service', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('builds tool definition with parameters when metadata provided', () => {
    const def = buildOpenAiToolDefinition({
      key: 'rag.search',
      label: 'Knowledge base search',
      description: null,
      min_role: 'EMPLOYEE',
      sensitive: false,
      standards_refs: [],
      enabled: true,
      metadata: {
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
          },
          required: ['query'],
        },
      },
    });
    expect(def.function.parameters).toEqual(
      expect.objectContaining({ required: ['query'], properties: expect.any(Object) })
    );
  });

  it('skips sync when no tools available', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) }),
      }),
    } as any;

    await syncAgentToolsFromRegistry({
      supabase,
      openAiApiKey: 'sk-test',
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
