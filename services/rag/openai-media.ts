import { buildOpenAiUrl } from '@prisma-glow/lib/openai/url';

interface GenerateVideoOptions {
  prompt: string;
  aspectRatio?: string;
  openAiApiKey?: string;
  model?: string;
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
  logInfo?: (message: string, meta?: Record<string, unknown>) => void;
}

export async function generateSoraVideo(options: GenerateVideoOptions) {
  const apiKey = options.openAiApiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY must be configured for Sora video generation');
  }

  const body = {
    model: options.model ?? process.env.OPENAI_SORA_MODEL ?? 'sora-2',
    prompt: options.prompt,
    aspect_ratio: options.aspectRatio ?? process.env.OPENAI_SORA_ASPECT_RATIO ?? '16:9',
  };

  try {
    const res = await fetch(buildOpenAiUrl('videos/generations'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Video generation failed with status ${res.status}: ${text}`);
    }

    const json = await res.json();
    options.logInfo?.('openai.sora_video_enqueued', { promptLength: options.prompt.length });
    return json;
  } catch (error) {
    options.logError('openai.sora_video_failed', error, {});
    throw error;
  }
}
