import type { Response } from 'express';
import type OpenAI from 'openai';

interface StreamEventPayload {
  type: string;
  data?: unknown;
}

interface StreamOptions {
  res: Response;
  openai: OpenAI;
  payload: Parameters<OpenAI['responses']['stream']>[0];
  debugLogger?: (event: { endpoint: string; response: any; requestPayload?: unknown; metadata?: Record<string, unknown> }) => Promise<void> | void;
  endpoint?: string;
  onStart?: () => Promise<void> | void;
  onEvent?: (event: StreamEventPayload) => Promise<void> | void;
  onResponseCompleted?: (event: { responseId: string }) => Promise<void> | void;
  onStreamClosed?: () => Promise<void> | void;
}

function writeSse(res: Response, event: StreamEventPayload) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export async function streamOpenAiResponse(options: StreamOptions) {
  const { res, openai, payload, debugLogger } = options;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  await options.onStart?.();

  let responseId: string | undefined;

  try {
    const stream = await openai.responses.stream(payload);

    res.on('close', () => {
      try {
        stream.controller?.abort();
      } catch (err) {
        // ignore
      }
    });

    for await (const event of stream) {
      let payloadForClient: StreamEventPayload;
      switch (event.type) {
        case 'response.output_text.delta':
          payloadForClient = { type: 'text-delta', data: event.delta };
          break;
        case 'response.output_text.done':
          payloadForClient = { type: 'text-done', data: event.text };
          break;
        case 'response.completed':
          responseId = event.response.id;
          payloadForClient = { type: 'completed', data: { responseId } };
          break;
        case 'response.error':
          payloadForClient = { type: 'error', data: event.error };
          break;
        case 'response.refusal.delta':
          payloadForClient = { type: 'refusal-delta', data: event.delta };
          break;
        case 'response.refusal.done':
          payloadForClient = { type: 'refusal-done', data: event.refusal };
          break;
        case 'response.audio.delta':
        case 'response.audio.done':
        case 'response.function_call.delta':
        case 'response.function_call.done':
        case 'response.output_image.delta':
        case 'response.output_image.done':
        case 'response.tool_call.delta':
        case 'response.tool_call.done':
          payloadForClient = { type: event.type, data: event };
          break;
        default:
          payloadForClient = { type: 'event', data: event };
      }

      await options.onEvent?.(payloadForClient);
      writeSse(res, payloadForClient);

      if (event.type === 'response.completed' && responseId) {
        await options.onResponseCompleted?.({ responseId });
      }
    }

    writeSse(res, { type: 'done' });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    writeSse(res, { type: 'error', data: { message: error instanceof Error ? error.message : String(error) } });
    res.end();
    throw error;
  } finally {
    await options.onStreamClosed?.();
    if (responseId && debugLogger) {
      await debugLogger({
        endpoint: options.endpoint ?? 'responses.stream',
        response: { id: responseId },
        requestPayload: payload,
        metadata: { streaming: true },
      });
    }
  }
}
