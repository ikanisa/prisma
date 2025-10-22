export type MessageContentType = 'text' | 'json';

export type ResponseMessageDraft = {
  id: string;
  role: string;
  name: string;
  content: string;
  contentType: MessageContentType;
};

export type ResponseToolOutputDraft = {
  id: string;
  toolCallId: string;
  output: string;
  outputType: MessageContentType;
};

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

export const createMessageDraft = (overrides?: Partial<ResponseMessageDraft>): ResponseMessageDraft => ({
  id: createId(),
  role: 'user',
  name: '',
  content: '',
  contentType: 'text',
  ...overrides,
});

export const createToolOutputDraft = (overrides?: Partial<ResponseToolOutputDraft>): ResponseToolOutputDraft => ({
  id: createId(),
  toolCallId: '',
  output: '',
  outputType: 'text',
  ...overrides,
});

export interface BuildModelResponsePayloadOptions {
  orgSlug: string;
  model: string;
  requestJson: string;
  messages: ResponseMessageDraft[];
  toolOutputs: ResponseToolOutputDraft[];
}

export type BuildModelResponsePayloadResult =
  | { error: string }
  | { payload: Record<string, unknown>; warnings: string[] };

const buildInvalidJsonMessage = (prefix: string, detail: unknown) => {
  if (detail && typeof detail === 'string') {
    return `${prefix}: ${detail}`;
  }
  if (detail instanceof Error) {
    return `${prefix}: ${detail.message}`;
  }
  return prefix;
};

export const buildModelResponsePayload = (
  options: BuildModelResponsePayloadOptions,
): BuildModelResponsePayloadResult => {
  const trimmedOrg = options.orgSlug.trim();
  if (!trimmedOrg) {
    return { error: 'Organisation slug is required for model responses.' };
  }

  let parsedRequest: Record<string, unknown> | undefined;
  const requestJson = options.requestJson.trim();
  if (requestJson) {
    try {
      const parsed = JSON.parse(requestJson) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Model request overrides must be a JSON object.');
      }
      parsedRequest = parsed as Record<string, unknown>;
    } catch (err) {
      return { error: buildInvalidJsonMessage('Invalid JSON for request overrides', err) };
    }
  }

  const warnings: string[] = [];

  const normalizedMessages: Array<Record<string, unknown>> = [];
  for (const message of options.messages) {
    const trimmedContent = message.content.trim();
    if (!trimmedContent) {
      continue;
    }

    let contentValue: unknown = message.contentType === 'text' ? trimmedContent : message.content;
    if (message.contentType === 'json') {
      try {
        contentValue = JSON.parse(message.content);
      } catch (err) {
        return { error: buildInvalidJsonMessage('Invalid JSON content in message', err) };
      }
    }

    const payloadMessage: Record<string, unknown> = {
      role: message.role.trim() || 'user',
      content: contentValue,
    };

    const trimmedName = message.name.trim();
    if (trimmedName) {
      payloadMessage.name = trimmedName;
    }

    normalizedMessages.push(payloadMessage);
  }

  const normalizedToolOutputs: Array<Record<string, unknown>> = [];
  for (const entry of options.toolOutputs) {
    const toolCallId = entry.toolCallId.trim();
    const trimmedOutput = entry.output.trim();
    if (!toolCallId || trimmedOutput.length === 0) {
      continue;
    }

    let outputValue: unknown = entry.outputType === 'text' ? trimmedOutput : entry.output;
    if (entry.outputType === 'json') {
      try {
        outputValue = JSON.parse(entry.output);
      } catch (err) {
        return { error: buildInvalidJsonMessage('Invalid JSON content in tool output', err) };
      }
    }

    normalizedToolOutputs.push({ tool_call_id: toolCallId, output: outputValue });
  }

  if (normalizedMessages.length === 0 && normalizedToolOutputs.length === 0) {
    return { error: 'At least one message or tool output is required.' };
  }

  const payload: Record<string, unknown> = { orgSlug: trimmedOrg };
  const trimmedModel = options.model.trim();
  if (trimmedModel) {
    payload.model = trimmedModel;
  }

  let requestPayload = parsedRequest ? { ...parsedRequest } : undefined;

  if (normalizedToolOutputs.length > 0) {
    if (requestPayload && Object.prototype.hasOwnProperty.call(requestPayload, 'tool_outputs')) {
      warnings.push('Request overrides already define `tool_outputs`. Builder entries will replace the override value.');
    }
    requestPayload = { ...(requestPayload ?? {}), tool_outputs: normalizedToolOutputs };
  }

  if (normalizedMessages.length > 0) {
    if (requestPayload) {
      if (Object.prototype.hasOwnProperty.call(requestPayload, 'input')) {
        warnings.push('Request overrides already define `input`. Builder messages will replace the override value.');
      }
      requestPayload.input = normalizedMessages;
    } else {
      payload.input = normalizedMessages;
    }
  }

  if (requestPayload) {
    payload.request = requestPayload;
  }

  return { payload, warnings };
};
