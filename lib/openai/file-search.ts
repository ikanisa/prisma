import type OpenAI from 'openai';

export interface OpenAiFileSearchCitation {
  documentId: string | null;
  chunkIndex: number | null;
  source: string | null;
  fileId: string | null;
  filename: string | null;
  url: string | null;
  [key: string]: unknown;
}

export interface OpenAiFileSearchItem {
  text: string;
  score: number | null;
  citation: OpenAiFileSearchCitation;
  raw?: Record<string, unknown>;
}

export interface RunOpenAiFileSearchOptions {
  client: Pick<OpenAI, 'responses'>;
  query: string;
  vectorStoreId: string;
  model: string;
  topK?: number;
  filters?: Record<string, unknown>;
  includeResults?: boolean;
}

export interface OpenAiFileSearchResult {
  items: OpenAiFileSearchItem[];
  usage?: Record<string, unknown>;
  rawResponse: unknown;
  rawText: string;
  rawJson: unknown;
}

function buildToolDefinition(options: RunOpenAiFileSearchOptions) {
  const tool: Record<string, unknown> = {
    type: 'file_search',
    vector_store_ids: [options.vectorStoreId],
  };

  if (typeof options.topK === 'number' && Number.isFinite(options.topK) && options.topK > 0) {
    tool.max_num_results = Math.max(1, Math.floor(options.topK));
  }

  if (options.filters && typeof options.filters === 'object') {
    tool.filters = options.filters;
  }

  return tool;
}

function extractOutputText(response: any): string {
  if (!response) return '';
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }

  const segments: string[] = [];

  if (Array.isArray(response.output)) {
    for (const item of response.output) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (typeof part?.text === 'string') {
          segments.push(part.text);
        } else if (Array.isArray(part?.text)) {
          for (const inner of part.text) {
            if (typeof inner === 'string') {
              segments.push(inner);
            }
          }
        }
      }
    }
  }

  if (segments.length > 0) {
    return segments.join('\n');
  }

  if (Array.isArray(response.content)) {
    for (const chunk of response.content) {
      if (typeof chunk === 'string') {
        segments.push(chunk);
      } else if (Array.isArray(chunk?.text)) {
        for (const text of chunk.text) {
          if (typeof text === 'string') {
            segments.push(text);
          }
        }
      }
    }
    if (segments.length > 0) {
      return segments.join('\n');
    }
  }

  return '';
}

function normaliseScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Math.min(1, Math.max(0, parsed));
    }
  }
  return null;
}

function normaliseChunkIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normaliseCitation(candidate: unknown): OpenAiFileSearchCitation {
  if (!candidate || typeof candidate !== 'object') {
    return {
      documentId: null,
      chunkIndex: null,
      source: null,
      fileId: null,
      filename: null,
      url: null,
    };
  }

  const record = candidate as Record<string, unknown>;
  const fileId =
    typeof record.fileId === 'string'
      ? record.fileId
      : typeof record.file_id === 'string'
      ? record.file_id
      : typeof record.id === 'string'
      ? record.id
      : null;

  const filename =
    typeof record.filename === 'string'
      ? record.filename
      : typeof record.name === 'string'
      ? record.name
      : null;

  const url = typeof record.url === 'string' ? record.url : null;

  const source =
    typeof record.source === 'string'
      ? record.source
      : filename
      ? filename
      : url;

  const documentId =
    typeof record.documentId === 'string'
      ? record.documentId
      : typeof record.document_id === 'string'
      ? record.document_id
      : typeof record.doc_id === 'string'
      ? record.doc_id
      : fileId;

  const chunkIndex = normaliseChunkIndex(record.chunkIndex ?? record.chunk_index ?? record.chunkId ?? record.chunk_id);

  return {
    ...record,
    documentId: documentId ?? null,
    chunkIndex,
    source: source ?? null,
    fileId,
    filename,
    url,
  };
}

function normaliseItem(item: unknown): OpenAiFileSearchItem {
  if (!item || typeof item !== 'object') {
    return {
      text: '',
      score: null,
      citation: normaliseCitation(null),
      raw: undefined,
    };
  }

  const record = item as Record<string, unknown>;
  const text = typeof record.text === 'string' ? record.text.trim() : '';
  const citationCandidate = record.citation ?? record.source ?? record.metadata ?? null;

  return {
    text,
    score: normaliseScore(record.score ?? record.confidence ?? record.similarity),
    citation: normaliseCitation(citationCandidate),
    raw: record,
  };
}

export async function runOpenAiFileSearch(options: RunOpenAiFileSearchOptions): Promise<OpenAiFileSearchResult> {
  if (!options.vectorStoreId) {
    throw new Error('vectorStoreId is required for file search');
  }

  const tool = buildToolDefinition(options);

  const requestPayload: Record<string, unknown> = {
    model: options.model,
    response_format: { type: 'json_object' },
    input: [
      {
        role: 'system',
        content:
          'You are a retrieval router for a regulated finance assistant. Use the file_search tool to fetch relevant passages and reply with JSON: {"results":[{"text":"<=400 characters","score":0-1,"citation":{"fileId":"file-...","filename":"...","url":"...","chunkIndex":0}}]}. Return an empty array when nothing relevant is found. Provide succinct summaries and never include extra commentary outside the JSON object.',
      },
      {
        role: 'user',
        content: options.query,
      },
    ],
    tools: [tool],
  };

  if (options.includeResults) {
    requestPayload.include = ['file_search_call.results'];
  }

  const response = await options.client.responses.create(requestPayload);
  const rawText = extractOutputText(response).trim();

  if (!rawText) {
    throw new Error('file search response missing output');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error('file search response was not valid JSON');
  }

  const records = Array.isArray((parsed as any)?.results) ? ((parsed as any).results as unknown[]) : [];
  const items = records.map((record) => normaliseItem(record));

  return {
    items,
    usage: (response as any)?.usage ?? undefined,
    rawResponse: response,
    rawText,
    rawJson: parsed,
  };
}
