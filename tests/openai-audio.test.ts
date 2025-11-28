import { afterEach, describe, expect, it, vi } from 'vitest';

describe('openai audio helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('transcribes audio buffer with default model', async () => {
    const mockClient = {
      audio: {
        transcriptions: {
          create: vi.fn().mockResolvedValue({ text: 'Hello world', language: 'en', duration: 1.23, usage: { tokens: 42 } }),
        },
        speech: {
          create: vi.fn(),
        },
      },
    } as any;

    const clientModule = await import('@prisma-glow/lib/openai/client');
    vi.spyOn(clientModule, 'getOpenAIClient').mockReturnValue(mockClient);

    const { transcribeAudioBuffer } = await import('../services/rag/openai-audio');

    const result = await transcribeAudioBuffer({
      audio: Buffer.from([0x01, 0x02, 0x03]),
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    expect(mockClient.audio.transcriptions.create).toHaveBeenCalledTimes(1);
    expect(result.text).toBe('Hello world');
    expect(result.language).toBe('en');
    expect(result.duration).toBe(1.23);
    expect(result.model).toBeDefined();
  });

  it('synthesises speech and returns base64 buffer', async () => {
    const audioBytes = Uint8Array.from([1, 2, 3, 4]).buffer;
    const mockClient = {
      audio: {
        transcriptions: {
          create: vi.fn(),
        },
        speech: {
          create: vi.fn().mockResolvedValue({ arrayBuffer: async () => audioBytes }),
        },
      },
    } as any;

    const clientModule = await import('@prisma-glow/lib/openai/client');
    vi.spyOn(clientModule, 'getOpenAIClient').mockReturnValue(mockClient);

    const { synthesizeSpeech } = await import('../services/rag/openai-audio');

    const result = await synthesizeSpeech({
      text: 'Hello agent',
      voice: 'verse',
      format: 'mp3',
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    expect(mockClient.audio.speech.create).toHaveBeenCalledTimes(1);
    expect(result.audio).toBeInstanceOf(Buffer);
    expect(result.audio.byteLength).toBe(4);
    expect(result.format).toBe('mp3');
    expect(result.voice).toBe('verse');
  });
});
