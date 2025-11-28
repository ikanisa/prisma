/**
 * Utility functions for working with OpenAI File Search Tool
 */

import type {
  FileSearchTool,
  FileSearchFilter,
  FileSearchResponse,
  FileCitationAnnotation,
  FileSearchResultItem,
  FileSearchCallItem,
  ExtractedFileSearchResults,
  AnnotatedFileContent,
} from './types/file-search.js';

/**
 * Create a file search tool configuration
 */
export function createFileSearchTool(options: {
  vectorStoreIds: string[];
  maxNumResults?: number;
  filters?: FileSearchFilter;
}): FileSearchTool {
  if (!options.vectorStoreIds || options.vectorStoreIds.length === 0) {
    throw new Error('At least one vector store ID is required for file search');
  }

  const tool: FileSearchTool = {
    type: 'file_search',
    vector_store_ids: options.vectorStoreIds,
  };

  if (typeof options.maxNumResults === 'number' && options.maxNumResults > 0) {
    tool.max_num_results = Math.max(1, Math.floor(options.maxNumResults));
  }

  if (options.filters) {
    tool.filters = options.filters;
  }

  return tool;
}

/**
 * Create a metadata filter for file search
 */
export function createFileSearchFilter(
  type: 'eq' | 'in',
  key: string,
  value: string | string[]
): FileSearchFilter {
  if (!key || typeof key !== 'string') {
    throw new Error('Filter key must be a non-empty string');
  }

  if (type === 'eq' && typeof value !== 'string') {
    throw new Error('For "eq" filter type, value must be a string');
  }

  if (type === 'in' && !Array.isArray(value)) {
    throw new Error('For "in" filter type, value must be an array');
  }

  return { type, key, value };
}

/**
 * Extract text content from file search response
 */
export function extractTextFromFileSearchResponse(response: FileSearchResponse): string {
  if (!response) {
    return '';
  }

  // Check for direct output_text property
  if (typeof response.output_text === 'string') {
    return response.output_text.trim();
  }

  const segments: string[] = [];

  // Extract from output array
  if (Array.isArray(response.output)) {
    for (const item of response.output) {
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (const part of item.content) {
          if (typeof part?.text === 'string') {
            segments.push(part.text);
          }
        }
      }
    }
  }

  return segments.join('\n').trim();
}

/**
 * Extract file citations from response
 */
export function extractFileCitations(response: FileSearchResponse): FileCitationAnnotation[] {
  if (!response || !Array.isArray(response.output)) {
    return [];
  }

  const citations: FileCitationAnnotation[] = [];

  for (const item of response.output) {
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const part of item.content) {
        const content = part as AnnotatedFileContent;
        if (Array.isArray(content.annotations)) {
          for (const annotation of content.annotations) {
            if (annotation.type === 'file_citation') {
              citations.push(annotation as FileCitationAnnotation);
            }
          }
        }
      }
    }
  }

  return citations;
}

/**
 * Extract file search results from response
 * Only available when include=['file_search_call.results'] is used
 */
export function extractFileSearchResults(response: FileSearchResponse): FileSearchResultItem[] {
  if (!response) {
    return [];
  }

  const results: FileSearchResultItem[] = [];

  // Check file_search_calls array (flattened format)
  if (Array.isArray(response.file_search_calls)) {
    for (const call of response.file_search_calls) {
      if (Array.isArray(call.search_results)) {
        results.push(...call.search_results);
      }
    }
  }

  // Check output array
  if (Array.isArray(response.output)) {
    for (const item of response.output) {
      if (item.type === 'file_search_call') {
        const callItem = item as FileSearchCallItem;
        if (Array.isArray(callItem.search_results)) {
          results.push(...callItem.search_results);
        }
      }
    }
  }

  return results;
}

/**
 * Extract file search call items from response
 */
export function extractFileSearchCalls(response: FileSearchResponse): FileSearchCallItem[] {
  if (!response) {
    return [];
  }

  const calls: FileSearchCallItem[] = [];

  // Check file_search_calls array (flattened format)
  if (Array.isArray(response.file_search_calls)) {
    calls.push(...response.file_search_calls);
  }

  // Check output array
  if (Array.isArray(response.output)) {
    for (const item of response.output) {
      if (item.type === 'file_search_call') {
        calls.push(item as FileSearchCallItem);
      }
    }
  }

  return calls;
}

/**
 * Extract complete file search results with answer, citations, and raw results
 */
export function extractCompleteFileSearchResults(
  response: FileSearchResponse
): ExtractedFileSearchResults {
  return {
    answer: extractTextFromFileSearchResponse(response),
    citations: extractFileCitations(response),
    results: extractFileSearchResults(response),
    usage: response.usage,
  };
}

/**
 * Validate vector store ID format
 */
export function validateVectorStoreId(vectorStoreId: string): boolean {
  if (!vectorStoreId || typeof vectorStoreId !== 'string') {
    return false;
  }
  // Vector store IDs typically start with 'vs_'
  return vectorStoreId.startsWith('vs_') && vectorStoreId.length > 3;
}

/**
 * Validate file ID format
 */
export function validateFileId(fileId: string): boolean {
  if (!fileId || typeof fileId !== 'string') {
    return false;
  }
  // File IDs typically start with 'file-'
  return fileId.startsWith('file-') && fileId.length > 5;
}

/**
 * Build include parameter for requesting search results
 */
export function buildIncludeParameter(includeResults: boolean): string[] {
  return includeResults ? ['file_search_call.results'] : [];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string | null {
  if (!filename || typeof filename !== 'string') {
    return null;
  }
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return null;
  }
  return filename.slice(lastDotIndex).toLowerCase();
}

/**
 * Check if file format is supported for file search
 */
export function isSupportedFileFormat(filename: string): boolean {
  const extension = getFileExtension(filename);
  if (!extension) {
    return false;
  }

  const supportedExtensions = [
    '.c', '.cpp', '.cs', '.css', '.doc', '.docx', '.go', '.html',
    '.java', '.js', '.json', '.md', '.pdf', '.php', '.pptx', '.py',
    '.rb', '.sh', '.tex', '.ts', '.txt'
  ];

  return supportedExtensions.includes(extension);
}

/**
 * Normalize citation index (ensure it's within text bounds)
 */
export function normalizeCitationIndex(
  citation: FileCitationAnnotation,
  textLength: number
): FileCitationAnnotation {
  const normalizedIndex = Math.max(0, Math.min(citation.index, textLength));
  return {
    ...citation,
    index: normalizedIndex,
  };
}

/**
 * Group citations by file ID
 */
export function groupCitationsByFile(
  citations: FileCitationAnnotation[]
): Map<string, FileCitationAnnotation[]> {
  const grouped = new Map<string, FileCitationAnnotation[]>();

  for (const citation of citations) {
    const fileId = citation.file_id;
    if (!grouped.has(fileId)) {
      grouped.set(fileId, []);
    }
    grouped.get(fileId)!.push(citation);
  }

  return grouped;
}

/**
 * Sort citations by index in text
 */
export function sortCitationsByIndex(
  citations: FileCitationAnnotation[]
): FileCitationAnnotation[] {
  return [...citations].sort((a, b) => a.index - b.index);
}

/**
 * Deduplicate citations (remove duplicates with same file_id and index)
 */
export function deduplicateCitations(
  citations: FileCitationAnnotation[]
): FileCitationAnnotation[] {
  const seen = new Set<string>();
  const unique: FileCitationAnnotation[] = [];

  for (const citation of citations) {
    const key = `${citation.file_id}:${citation.index}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(citation);
    }
  }

  return unique;
}
