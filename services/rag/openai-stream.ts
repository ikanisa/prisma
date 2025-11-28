import type { Response } from 'express';
interface StreamEventPayload {
  type: string;
  data?: unknown;
}

type OpenAiResponsesClient = { responses: { stream: (body: any, options?: any) => AsyncIterable<any> & { controller?: AbortController } } };
type StreamPayload = any;

interface StreamOptions {
  res: Response;
  openai: OpenAiResponsesClient;
  payload: StreamPayload;
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

function toEventType(type: string | undefined): string {
  if (!type) return 'event';
  const trimmed = type.startsWith('response.') ? type.slice('response.'.length) : type;
  return trimmed.replace(/\./g, '-');
}

function normaliseStreamEvent(
  event: any,
): { payload: StreamEventPayload; responseId?: string; triggerCompletion?: boolean } {
  const eventType = event?.type as string | undefined;
  const baseType = toEventType(eventType);

  if (!event || typeof event !== 'object') {
    return { payload: { type: baseType, data: null } };
  }

  switch (eventType) {
    case 'response.created':
      return {
        payload: {
          type: 'response-created',
          data: {
            responseId: event.response?.id ?? null,
            model: event.response?.model ?? null,
          },
        },
        responseId: event.response?.id,
      };
    case 'response.output_text.delta':
      return { payload: { type: 'text-delta', data: event.delta ?? '' } };
    case 'response.output_text.done':
      return { payload: { type: 'text-done', data: event.text ?? '' } };
    case 'response.output_message.delta':
      return {
        payload: {
          type: 'message-delta',
          data: {
            role: event.delta?.role ?? null,
            content: event.delta?.content ?? null,
          },
        },
      };
    case 'response.output_message.done':
      return {
        payload: {
          type: 'message-done',
          data: {
            role: event.message?.role ?? null,
            content: event.message?.content ?? null,
          },
        },
      };
    case 'response.tool_call.delta':
      return {
        payload: {
          type: 'tool-delta',
          data: {
            id: event.delta?.id ?? null,
            name: event.delta?.function?.name ?? null,
            argumentsDelta: event.delta?.function?.arguments ?? null,
          },
        },
      };
    case 'response.tool_call.done':
      return {
        payload: {
          type: 'tool-done',
          data: {
            id: event.tool_call?.id ?? null,
            name: event.tool_call?.function?.name ?? null,
            arguments: event.tool_call?.function?.arguments ?? null,
            output: event.tool_call?.output ?? null,
          },
        },
      };
    case 'response.function_call_arguments.delta':
      return {
        payload: {
          type: 'function-arguments-delta',
          data: {
            id: event.id ?? null,
            argumentsDelta: event.delta ?? null,
          },
        },
      };
    case 'response.function_call_arguments.done':
      return {
        payload: {
          type: 'function-arguments-done',
          data: {
            id: event.id ?? null,
            arguments: event.arguments ?? null,
          },
        },
      };
    case 'response.refusal.delta':
      return { payload: { type: 'refusal-delta', data: event.delta ?? null } };
    case 'response.refusal.done':
      return { payload: { type: 'refusal-done', data: event.refusal ?? null } };
    case 'response.citation.delta':
      return { payload: { type: 'citation-delta', data: event.delta ?? null } };
    case 'response.citation.done':
      return { payload: { type: 'citation-done', data: event.citation ?? null } };
    case 'response.usage.delta':
      return {
        payload: {
          type: 'usage-delta',
          data: event.delta ?? null,
        },
      };
    case 'response.error':
      return { payload: { type: 'error', data: event.error ?? null } };
    case 'response.completed':
      return {
        payload: {
          type: 'completed',
          data: {
            responseId: event.response?.id ?? null,
            usage: event.response?.usage ?? event.usage ?? null,
          },
        },
        responseId: event.response?.id,
        triggerCompletion: true,
      };
    default: {
      const data: Record<string, unknown> = {};
      if (event.delta !== undefined) data.delta = event.delta;
      if (event.response?.id) {
        data.responseId = event.response.id;
      }
      if (event.response?.usage ?? event.usage) {
        data.usage = event.response?.usage ?? event.usage;
      }
      if (event.error) data.error = event.error;
      if (event.message) data.message = event.message;
      if (event.item) data.item = event.item;
      if (Object.keys(data).length === 0) {
        data.type = eventType ?? 'unknown';
      }
      return { payload: { type: baseType, data } };
    }
  }
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
      const { payload, responseId: eventResponseId, triggerCompletion } = normaliseStreamEvent(event);
      if (eventResponseId) {
        responseId = eventResponseId;
      }

      await options.onEvent?.(payload);
      writeSse(res, payload);

      if (triggerCompletion && responseId) {
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
