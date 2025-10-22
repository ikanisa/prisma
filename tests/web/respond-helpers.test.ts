import { describe, expect, it } from 'vitest';
import {
  buildModelResponsePayload,
  createMessageDraft,
  createToolOutputDraft,
} from '../../apps/web/app/agent-chat/respond-helpers';

describe('buildModelResponsePayload', () => {
  it('returns an error when overrides JSON is invalid', () => {
    const result = buildModelResponsePayload({
      orgSlug: 'demo',
      model: 'gpt-4.1-mini',
      requestJson: '{',
      messages: [createMessageDraft({ content: 'Hello' })],
      toolOutputs: [],
    });

    expect(result).toEqual({ error: expect.stringMatching(/Invalid JSON for request overrides/) });
  });

  it('builds a payload with normalized messages and tool outputs', () => {
    const result = buildModelResponsePayload({
      orgSlug: ' demo ',
      model: '  gpt-4.1-mini  ',
      requestJson: '{"temperature":0.2}',
      messages: [
        createMessageDraft({ role: 'user', content: ' First message ' }),
        createMessageDraft({
          role: 'assistant',
          contentType: 'json',
          content: '{"type":"output_text","text":"Secondary"}',
          name: 'assistant-step',
        }),
      ],
      toolOutputs: [
        createToolOutputDraft({ toolCallId: ' call_123 ', output: '   result text   ' }),
        createToolOutputDraft({
          toolCallId: 'call_json',
          outputType: 'json',
          output: '{"value":42}',
        }),
      ],
    });

    expect('payload' in result).toBe(true);
    if ('payload' in result) {
      expect(result.payload).toMatchObject({
        orgSlug: 'demo',
        model: 'gpt-4.1-mini',
      });
      expect(result.payload.request).toMatchObject({ temperature: 0.2 });
      const request = result.payload.request as Record<string, unknown>;
      expect(Array.isArray(request.input)).toBe(true);
      expect(request.input).toHaveLength(2);
      expect(request.input?.[0]).toMatchObject({ role: 'user', content: 'First message' });
      expect(request.input?.[1]).toMatchObject({
        role: 'assistant',
        name: 'assistant-step',
        content: { type: 'output_text', text: 'Secondary' },
      });
      expect(Array.isArray(request.tool_outputs)).toBe(true);
      expect(request.tool_outputs).toHaveLength(2);
      expect(request.tool_outputs?.[0]).toMatchObject({
        tool_call_id: 'call_123',
        output: 'result text',
      });
      expect(request.tool_outputs?.[1]).toMatchObject({
        tool_call_id: 'call_json',
        output: { value: 42 },
      });
      expect(result.warnings).toEqual([]);
    }
  });

  it('returns an error when all message and tool output content are blank', () => {
    const result = buildModelResponsePayload({
      orgSlug: 'demo',
      model: 'gpt-4.1-mini',
      requestJson: '',
      messages: [createMessageDraft({ content: '   ' })],
      toolOutputs: [createToolOutputDraft({ toolCallId: 'call', output: '   ' })],
    });

    expect(result).toEqual({ error: 'At least one message or tool output is required.' });
  });

  it('returns an error when a JSON message cannot be parsed', () => {
    const result = buildModelResponsePayload({
      orgSlug: 'demo',
      model: 'gpt-4.1-mini',
      requestJson: '',
      messages: [createMessageDraft({ contentType: 'json', content: '{invalid}' })],
      toolOutputs: [],
    });

    expect(result).toEqual({ error: expect.stringMatching(/Invalid JSON content in message/) });
  });

  it('returns warnings when overrides already include input or tool outputs', () => {
    const result = buildModelResponsePayload({
      orgSlug: 'demo',
      model: 'gpt-4.1-mini',
      requestJson: '{"input":[],"tool_outputs":[{"tool_call_id":"existing","output":"value"}],"temperature":0.4}',
      messages: [createMessageDraft({ content: 'Hello' })],
      toolOutputs: [createToolOutputDraft({ toolCallId: 'call_1', output: 'result' })],
    });

    expect('payload' in result).toBe(true);
    if ('payload' in result) {
      expect(result.warnings).toEqual([
        'Request overrides already define `tool_outputs`. Builder entries will replace the override value.',
        'Request overrides already define `input`. Builder messages will replace the override value.',
      ]);
      const request = (result.payload.request ?? {}) as Record<string, unknown>;
      expect(request.temperature).toBe(0.4);
      expect(request.input).toHaveLength(1);
      expect(request.tool_outputs).toHaveLength(1);
    }
  });
});
