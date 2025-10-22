import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';

import { streamOpenAiResponse } from '../services/rag/openai-stream';

class MockResponse extends EventEmitter {
  public headers: Record<string, string> = {};
  public writes: string[] = [];
  public ended = false;

  setHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  flushHeaders() {
    // no-op for tests
  }

  write(chunk: string) {
    this.writes.push(chunk);
  }

  end() {
    this.ended = true;
  }
}

describe('streamOpenAiResponse', () => {
  it('streams events, triggers callbacks, and logs debug metadata', async () => {
    const response = new MockResponse();
    const onStart = vi.fn();
    const onEvent = vi.fn();
    const onResponseCompleted = vi.fn();
    const onStreamClosed = vi.fn();
    const debugLogger = vi.fn();

    const asyncEvents = [
      { type: 'response.output_text.delta', delta: 'Hello' },
      { type: 'response.output_text.done', text: 'Hello world' },
      { type: 'response.completed', response: { id: 'resp_123' } },
    ];

    const abort = vi.fn();

    const openai = {
      responses: {
        stream: vi.fn(async () => ({
          controller: { abort },
          async *[Symbol.asyncIterator]() {
            for (const event of asyncEvents) {
              yield event as any;
            }
          },
        })),
      },
    } as unknown as import('openai').default;

    await streamOpenAiResponse({
      res: response as any,
      openai,
      payload: { model: 'gpt-test', input: [] } as any,
      onStart,
      onEvent,
      onResponseCompleted,
      onStreamClosed,
      debugLogger,
    });

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledTimes(asyncEvents.length);
    expect(onResponseCompleted).toHaveBeenCalledWith({ responseId: 'resp_123' });
    expect(onStreamClosed).toHaveBeenCalledTimes(1);
    expect(response.ended).toBe(true);
    expect(response.writes.at(-2)).toContain('"type":"done"');
    expect(response.writes.at(-1)).toBe('data: [DONE]\n\n');
    expect(debugLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'responses.stream',
        response: { id: 'resp_123' },
        metadata: { streaming: true },
      }),
    );

    response.emit('close');
    expect(abort).toHaveBeenCalledTimes(1);
  });
});
