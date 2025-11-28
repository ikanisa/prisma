import { describe, expect, it, vi, beforeEach } from 'vitest';
import { generateSoraVideo } from '../services/rag/openai-media';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('generateSoraVideo', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('throws when API key missing', async () => {
    await expect(
      generateSoraVideo({ prompt: 'Test video', logError: vi.fn() }),
    ).rejects.toThrow();
  });

  it('returns job payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'job_1', status: 'queued' }), { status: 200 }),
    );

    const logInfo = vi.fn();
    const job = await generateSoraVideo({ prompt: 'Test video', openAiApiKey: 'sk-test', logError: vi.fn(), logInfo });

    expect(job).toEqual({ id: 'job_1', status: 'queued' });
    expect(logInfo).toHaveBeenCalledWith('openai.sora_video_enqueued', { promptLength: 10 });
  });
});
