import { Readable } from 'node:stream';

import { getOpenAIClient } from '../../lib/openai/client';

type LogFn = (message: string, meta?: Record<string, unknown>) => void;

export interface AudioTranscriptionOptions {
  audio: Buffer;
  mimeType?: string;
  fileName?: string;
  model?: string;
  language?: string;
  responseFormat?: 'text' | 'srt' | 'verbose_json';
  logInfo?: LogFn;
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
}

export interface AudioTranscriptionResult {
  text: string;
  model: string;
  language?: string;
  duration?: number;
  segments?: unknown;
  usage?: Record<string, unknown>;
  rawResponse: unknown;
}

export interface TextToSpeechOptions {
  text: string;
  voice?: string;
  model?: string;
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'pcm16';
  logInfo?: LogFn;
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
}

export interface TextToSpeechResult {
  audio: Buffer;
  model: string;
  voice: string;
  format: string;
  rawResponse: unknown;
}

function createReadableAudioStream(buffer: Buffer, fileName?: string) {
  const stream = Readable.from(buffer);
  Object.assign(stream, { path: fileName ?? 'audio-input' });
  return stream;
}

export async function transcribeAudioBuffer(options: AudioTranscriptionOptions): Promise<AudioTranscriptionResult> {
  if (!options.audio || !Buffer.isBuffer(options.audio)) {
    throw new Error('Audio buffer is required for transcription.');
  }

  const client = getOpenAIClient();
  const model =
    options.model ??
    process.env.OPENAI_TRANSCRIPTION_MODEL ??
    process.env.OPENAI_WHISPER_MODEL ??
    'gpt-4o-mini-transcribe';

  const responseFormat = options.responseFormat ?? 'verbose_json';
  const fileName = options.fileName ?? `audio-${Date.now()}.wav`;

  try {
    const response: any = await client.audio.transcriptions.create({
      file: createReadableAudioStream(options.audio, fileName) as any,
      model,
      response_format: responseFormat,
      temperature: 0,
      ...(options.language ? { language: options.language } : {}),
    });

    let text = '';
    if (typeof response.text === 'string') {
      text = response.text;
    } else if (Array.isArray(response.segments)) {
      text = response.segments.map((segment: any) => segment?.text ?? '').join(' ').trim();
    } else if (typeof response === 'string') {
      text = response;
    }
    text = text.trim();

    options.logInfo?.('openai.audio_transcription_completed', {
      model,
      hasText: text.length > 0,
      language: response?.language ?? options.language ?? null,
    });

    return {
      text,
      model,
      language: response?.language ?? options.language,
      duration: response?.duration ?? null,
      segments: response?.segments ?? null,
      usage: response?.usage ?? undefined,
      rawResponse: response,
    };
  } catch (error) {
    options.logError('openai.audio_transcription_failed', error, { model, fileName });
    throw error;
  }
}

export async function synthesizeSpeech(options: TextToSpeechOptions): Promise<TextToSpeechResult> {
  const text = options.text?.trim();
  if (!text) {
    throw new Error('Text is required to synthesise speech.');
  }

  const client = getOpenAIClient();
  const model = options.model ?? process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';
  const voice = options.voice ?? process.env.OPENAI_TTS_VOICE ?? 'alloy';
  const format = options.format ?? process.env.OPENAI_TTS_FORMAT ?? 'mp3';

  try {
    const response = await client.audio.speech.create({
      model,
      voice,
      input: text,
      format,
    });

    const audio = Buffer.from(await response.arrayBuffer());

    options.logInfo?.('openai.audio_tts_completed', {
      model,
      voice,
      bytes: audio.byteLength,
    });

    return {
      audio,
      model,
      voice,
      format,
      rawResponse: response,
    };
  } catch (error) {
    options.logError('openai.audio_tts_failed', error, { model, voice });
    throw error;
  }
}
