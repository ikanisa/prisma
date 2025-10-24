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
export declare function runOpenAiFileSearch(options: RunOpenAiFileSearchOptions): Promise<OpenAiFileSearchResult>;
//# sourceMappingURL=file-search.d.ts.map