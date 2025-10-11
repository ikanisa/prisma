import { getOpenAIClient } from '../../lib/openai/client';

type LogFn = (message: string, meta?: Record<string, unknown>) => void;

export interface VisionOcrOptions {
  imageUrl: string;
  instructions?: string;
  languageHint?: string;
  model?: string;
  maxOutputTokens?: number;
  logInfo?: LogFn;
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
}

export interface VisionOcrResult {
  text: string;
  model: string;
  usage?: Record<string, unknown>;
  rawResponse: unknown;
}

function normaliseOutputText(response: any): string {
  if (!response) return '';
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }
  if (Array.isArray(response.output)) {
    const parts: string[] = [];
    for (const item of response.output) {
      if (item && typeof item === 'object' && item.type === 'output_text' && typeof item.text === 'string') {
        parts.push(item.text);
      }
    }
    if (parts.length > 0) {
      return parts.join('\n');
    }
  }
  if (response.content && Array.isArray(response.content)) {
    const parts: string[] = [];
    for (const message of response.content) {
      if (message && typeof message === 'object' && Array.isArray(message.text)) {
        for (const text of message.text) {
          if (typeof text === 'string') {
            parts.push(text);
          }
        }
      }
    }
    if (parts.length > 0) {
      return parts.join('\n');
    }
  }
  return '';
}

export async function extractVisionOcr(options: VisionOcrOptions): Promise<VisionOcrResult> {
  const imageUrl = options.imageUrl.trim();
  if (!imageUrl) {
    throw new Error('Image URL is required for vision OCR.');
  }

  const model = options.model ?? process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_AGENT_MODEL ?? 'gpt-4.1-mini';
  const maxOutputTokens = options.maxOutputTokens ?? 2048;
  const instructions =
    options.instructions?.trim() ??
    'Extract all legible text from the provided document image. Preserve reading order and separate sections with blank lines.';
  const languageHint =
    options.languageHint?.trim() ??
    'Respond in the dominant language of the document. Use UTF-8 characters and include accents when appropriate.';

  const client = getOpenAIClient();

  try {
    const response = await client.responses.create({
      model,
      max_output_tokens: maxOutputTokens,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: `${instructions}\n\n${languageHint}`,
            },
          ],
        },
        {
          role: 'user',
          content: [
            ...(options.instructions
              ? [
                  {
                    type: 'input_text' as const,
                    text: options.instructions,
                  },
                ]
              : []),
            {
              type: 'input_image',
              image_url: imageUrl,
            },
          ],
        },
      ],
      response_format: { type: 'text' },
    });

    const text = normaliseOutputText(response).trim();

    options.logInfo?.('openai.vision_ocr_completed', {
      model,
      hasText: text.length > 0,
      usage: response?.usage ?? null,
    });

    return {
      text,
      model,
      usage: response?.usage ?? undefined,
      rawResponse: response,
    };
  } catch (error) {
    options.logError('openai.vision_ocr_failed', error, { model, imageUrl });
    throw error;
  }
}
