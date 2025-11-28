import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createRealtimeSession, getRealtimeTurnServers } from '../services/rag/openai-realtime';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('createRealtimeSession', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('throws when API key missing', async () => {
    await expect(
      createRealtimeSession({
        openAiApiKey: undefined,
        logError: vi.fn(),
      }),
    ).rejects.toThrow();
  });

  it('returns session response', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ id: 'sess_123', client_secret: { value: 'secret' }, expires_at: '2025-01-01T00:00:00Z' }),
        { status: 200 },
      ),
    );

    const logInfo = vi.fn();
    const result = await createRealtimeSession({ openAiApiKey: 'sk-test', logError: vi.fn(), logInfo });

    expect(result.client_secret?.value).toBe('secret');
    expect(logInfo).toHaveBeenCalledWith('openai.realtime_session_created', {
      sessionId: 'sess_123',
      expiry: '2025-01-01T00:00:00Z',
    });
  });
});

describe('getRealtimeTurnServers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns empty array when env unset', () => {
    vi.unstubAllEnvs();
    expect(getRealtimeTurnServers()).toEqual([]);
  });

  it('parses JSON array config', () => {
    vi.stubEnv(
      'OPENAI_REALTIME_TURN_SERVERS',
      JSON.stringify([
        { urls: 'turn:example.com:3478', username: 'user', credential: 'secret' },
        { urls: 'stun:example.com:3478' },
      ]),
    );
    expect(getRealtimeTurnServers()).toEqual([
      { urls: 'turn:example.com:3478', username: 'user', credential: 'secret' },
      { urls: 'stun:example.com:3478' },
    ]);
  });

  it('supports delimited string config', () => {
    vi.stubEnv('OPENAI_REALTIME_TURN_SERVERS', 'turn:one:3478|alice|p@ss,stun:two:3478');
    expect(getRealtimeTurnServers()).toEqual([
      { urls: 'turn:one:3478', username: 'alice', credential: 'p@ss' },
      { urls: 'stun:two:3478' },
    ]);
  });
});
