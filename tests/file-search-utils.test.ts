import { describe, expect, it } from 'vitest';

import {
  createFileSearchTool,
  createFileSearchFilter,
  extractTextFromFileSearchResponse,
  extractFileCitations,
  extractFileSearchResults,
  extractFileSearchCalls,
  extractCompleteFileSearchResults,
  validateVectorStoreId,
  validateFileId,
  buildIncludeParameter,
  getFileExtension,
  isSupportedFileFormat,
  normalizeCitationIndex,
  groupCitationsByFile,
  sortCitationsByIndex,
  deduplicateCitations,
} from '../services/rag/file-search-utils.js';

import type {
  FileSearchResponse,
  FileCitationAnnotation,
  FileSearchResultItem,
} from '../services/rag/types/file-search.js';

describe('createFileSearchTool', () => {
  it('creates a basic file search tool', () => {
    const tool = createFileSearchTool({
      vectorStoreIds: ['vs_abc123'],
    });

    expect(tool).toEqual({
      type: 'file_search',
      vector_store_ids: ['vs_abc123'],
    });
  });

  it('includes max_num_results when specified', () => {
    const tool = createFileSearchTool({
      vectorStoreIds: ['vs_abc123'],
      maxNumResults: 5,
    });

    expect(tool).toEqual({
      type: 'file_search',
      vector_store_ids: ['vs_abc123'],
      max_num_results: 5,
    });
  });

  it('includes filters when specified', () => {
    const filter = { type: 'eq' as const, key: 'category', value: 'finance' };
    const tool = createFileSearchTool({
      vectorStoreIds: ['vs_abc123'],
      filters: filter,
    });

    expect(tool.filters).toEqual(filter);
  });

  it('throws when no vector store IDs provided', () => {
    expect(() =>
      createFileSearchTool({
        vectorStoreIds: [],
      })
    ).toThrow('At least one vector store ID is required');
  });

  it('floors non-integer max_num_results', () => {
    const tool = createFileSearchTool({
      vectorStoreIds: ['vs_abc123'],
      maxNumResults: 5.7,
    });

    expect(tool.max_num_results).toBe(5);
  });
});

describe('createFileSearchFilter', () => {
  it('creates an equality filter', () => {
    const filter = createFileSearchFilter('eq', 'department', 'finance');

    expect(filter).toEqual({
      type: 'eq',
      key: 'department',
      value: 'finance',
    });
  });

  it('creates an "in" filter', () => {
    const filter = createFileSearchFilter('in', 'category', ['blog', 'announcement']);

    expect(filter).toEqual({
      type: 'in',
      key: 'category',
      value: ['blog', 'announcement'],
    });
  });

  it('throws when key is empty', () => {
    expect(() => createFileSearchFilter('eq', '', 'value')).toThrow('Filter key must be a non-empty string');
  });

  it('throws when eq filter has array value', () => {
    expect(() => createFileSearchFilter('eq', 'key', ['val1', 'val2'] as any)).toThrow(
      'For "eq" filter type, value must be a string'
    );
  });

  it('throws when in filter has string value', () => {
    expect(() => createFileSearchFilter('in', 'key', 'value' as any)).toThrow(
      'For "in" filter type, value must be an array'
    );
  });
});

describe('extractTextFromFileSearchResponse', () => {
  it('extracts text from output_text property', () => {
    const response: FileSearchResponse = {
      output_text: '  This is the answer  ',
    };

    expect(extractTextFromFileSearchResponse(response)).toBe('This is the answer');
  });

  it('extracts text from output array', () => {
    const response: FileSearchResponse = {
      output: [
        {
          type: 'message',
          content: [
            { type: 'output_text', text: 'Part 1' },
            { type: 'output_text', text: 'Part 2' },
          ],
        },
      ],
    };

    expect(extractTextFromFileSearchResponse(response)).toBe('Part 1\nPart 2');
  });

  it('returns empty string for empty response', () => {
    expect(extractTextFromFileSearchResponse({} as FileSearchResponse)).toBe('');
  });

  it('handles null response', () => {
    expect(extractTextFromFileSearchResponse(null as any)).toBe('');
  });
});

describe('extractFileCitations', () => {
  it('extracts citations from response', () => {
    const response: FileSearchResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'Some text',
              annotations: [
                {
                  type: 'file_citation',
                  index: 10,
                  file_id: 'file-abc123',
                  filename: 'doc.pdf',
                },
                {
                  type: 'file_citation',
                  index: 20,
                  file_id: 'file-xyz789',
                  filename: 'report.md',
                },
              ],
            },
          ],
        },
      ],
    };

    const citations = extractFileCitations(response);

    expect(citations).toHaveLength(2);
    expect(citations[0]).toMatchObject({
      type: 'file_citation',
      index: 10,
      file_id: 'file-abc123',
      filename: 'doc.pdf',
    });
  });

  it('returns empty array for response without citations', () => {
    const response: FileSearchResponse = {
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: 'Text without citations' }],
        },
      ],
    };

    expect(extractFileCitations(response)).toEqual([]);
  });

  it('handles null response', () => {
    expect(extractFileCitations(null as any)).toEqual([]);
  });
});

describe('extractFileSearchResults', () => {
  it('extracts results from file_search_calls', () => {
    const response: FileSearchResponse = {
      file_search_calls: [
        {
          type: 'file_search_call',
          id: 'fs_123',
          status: 'completed',
          search_results: [
            {
              id: 'result_1',
              score: 0.95,
              content: 'Content 1',
              file_id: 'file-abc',
              filename: 'doc1.pdf',
            },
          ],
        },
      ],
    };

    const results = extractFileSearchResults(response);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'result_1',
      score: 0.95,
      file_id: 'file-abc',
    });
  });

  it('extracts results from output array', () => {
    const response: FileSearchResponse = {
      output: [
        {
          type: 'file_search_call',
          id: 'fs_123',
          status: 'completed',
          search_results: [
            {
              id: 'result_1',
              content: 'Content 1',
            },
          ],
        },
      ],
    };

    const results = extractFileSearchResults(response);
    expect(results).toHaveLength(1);
  });

  it('returns empty array when no results', () => {
    const response: FileSearchResponse = {
      output: [
        {
          type: 'file_search_call',
          id: 'fs_123',
          status: 'completed',
          search_results: null,
        },
      ],
    };

    expect(extractFileSearchResults(response)).toEqual([]);
  });
});

describe('extractCompleteFileSearchResults', () => {
  it('extracts all information from response', () => {
    const response: FileSearchResponse = {
      output_text: 'The answer text',
      file_search_calls: [
        {
          type: 'file_search_call',
          id: 'fs_123',
          status: 'completed',
          search_results: [{ id: 'result_1', content: 'Content' }],
        },
      ],
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'The answer text',
              annotations: [
                {
                  type: 'file_citation',
                  index: 5,
                  file_id: 'file-123',
                  filename: 'doc.pdf',
                },
              ],
            },
          ],
        },
      ],
      usage: { total_tokens: 100 },
    };

    const result = extractCompleteFileSearchResults(response);

    expect(result.answer).toBe('The answer text');
    expect(result.citations).toHaveLength(1);
    expect(result.results).toHaveLength(1);
    expect(result.usage).toEqual({ total_tokens: 100 });
  });
});

describe('validateVectorStoreId', () => {
  it('validates correct vector store IDs', () => {
    expect(validateVectorStoreId('vs_abc123')).toBe(true);
    expect(validateVectorStoreId('vs_xyz')).toBe(true);
  });

  it('rejects invalid vector store IDs', () => {
    expect(validateVectorStoreId('abc123')).toBe(false);
    expect(validateVectorStoreId('vs_')).toBe(false);
    expect(validateVectorStoreId('')).toBe(false);
    expect(validateVectorStoreId(null as any)).toBe(false);
  });
});

describe('validateFileId', () => {
  it('validates correct file IDs', () => {
    expect(validateFileId('file-abc123')).toBe(true);
    expect(validateFileId('file-xyz789')).toBe(true);
  });

  it('rejects invalid file IDs', () => {
    expect(validateFileId('abc123')).toBe(false);
    expect(validateFileId('file-')).toBe(false);
    expect(validateFileId('')).toBe(false);
    expect(validateFileId(null as any)).toBe(false);
  });
});

describe('buildIncludeParameter', () => {
  it('returns results parameter when true', () => {
    expect(buildIncludeParameter(true)).toEqual(['file_search_call.results']);
  });

  it('returns empty array when false', () => {
    expect(buildIncludeParameter(false)).toEqual([]);
  });
});

describe('getFileExtension', () => {
  it('extracts file extension', () => {
    expect(getFileExtension('document.pdf')).toBe('.pdf');
    expect(getFileExtension('report.md')).toBe('.md');
    expect(getFileExtension('file.tar.gz')).toBe('.gz');
  });

  it('handles files without extension', () => {
    expect(getFileExtension('README')).toBe(null);
    expect(getFileExtension('file.')).toBe(null);
  });

  it('handles invalid inputs', () => {
    expect(getFileExtension('')).toBe(null);
    expect(getFileExtension(null as any)).toBe(null);
  });

  it('returns lowercase extension', () => {
    expect(getFileExtension('Document.PDF')).toBe('.pdf');
  });
});

describe('isSupportedFileFormat', () => {
  it('recognizes supported formats', () => {
    expect(isSupportedFileFormat('document.pdf')).toBe(true);
    expect(isSupportedFileFormat('notes.md')).toBe(true);
    expect(isSupportedFileFormat('code.py')).toBe(true);
    expect(isSupportedFileFormat('data.json')).toBe(true);
    expect(isSupportedFileFormat('report.docx')).toBe(true);
  });

  it('rejects unsupported formats', () => {
    expect(isSupportedFileFormat('image.png')).toBe(false);
    expect(isSupportedFileFormat('video.mp4')).toBe(false);
    expect(isSupportedFileFormat('data.csv')).toBe(false);
    expect(isSupportedFileFormat('archive.zip')).toBe(false);
  });

  it('handles files without extension', () => {
    expect(isSupportedFileFormat('README')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isSupportedFileFormat('Document.PDF')).toBe(true);
    expect(isSupportedFileFormat('Notes.MD')).toBe(true);
  });
});

describe('normalizeCitationIndex', () => {
  it('keeps valid index unchanged', () => {
    const citation: FileCitationAnnotation = {
      type: 'file_citation',
      index: 50,
      file_id: 'file-123',
      filename: 'doc.pdf',
    };

    const normalized = normalizeCitationIndex(citation, 100);
    expect(normalized.index).toBe(50);
  });

  it('clamps index to text length', () => {
    const citation: FileCitationAnnotation = {
      type: 'file_citation',
      index: 150,
      file_id: 'file-123',
      filename: 'doc.pdf',
    };

    const normalized = normalizeCitationIndex(citation, 100);
    expect(normalized.index).toBe(100);
  });

  it('clamps negative index to zero', () => {
    const citation: FileCitationAnnotation = {
      type: 'file_citation',
      index: -10,
      file_id: 'file-123',
      filename: 'doc.pdf',
    };

    const normalized = normalizeCitationIndex(citation, 100);
    expect(normalized.index).toBe(0);
  });
});

describe('groupCitationsByFile', () => {
  it('groups citations by file_id', () => {
    const citations: FileCitationAnnotation[] = [
      { type: 'file_citation', index: 10, file_id: 'file-abc', filename: 'doc1.pdf' },
      { type: 'file_citation', index: 20, file_id: 'file-xyz', filename: 'doc2.pdf' },
      { type: 'file_citation', index: 30, file_id: 'file-abc', filename: 'doc1.pdf' },
    ];

    const grouped = groupCitationsByFile(citations);

    expect(grouped.size).toBe(2);
    expect(grouped.get('file-abc')).toHaveLength(2);
    expect(grouped.get('file-xyz')).toHaveLength(1);
  });

  it('handles empty array', () => {
    const grouped = groupCitationsByFile([]);
    expect(grouped.size).toBe(0);
  });
});

describe('sortCitationsByIndex', () => {
  it('sorts citations by index', () => {
    const citations: FileCitationAnnotation[] = [
      { type: 'file_citation', index: 30, file_id: 'file-abc', filename: 'doc.pdf' },
      { type: 'file_citation', index: 10, file_id: 'file-xyz', filename: 'doc.pdf' },
      { type: 'file_citation', index: 20, file_id: 'file-123', filename: 'doc.pdf' },
    ];

    const sorted = sortCitationsByIndex(citations);

    expect(sorted[0].index).toBe(10);
    expect(sorted[1].index).toBe(20);
    expect(sorted[2].index).toBe(30);
  });

  it('does not mutate original array', () => {
    const citations: FileCitationAnnotation[] = [
      { type: 'file_citation', index: 30, file_id: 'file-abc', filename: 'doc.pdf' },
      { type: 'file_citation', index: 10, file_id: 'file-xyz', filename: 'doc.pdf' },
    ];

    const original = [...citations];
    sortCitationsByIndex(citations);

    expect(citations).toEqual(original);
  });
});

describe('deduplicateCitations', () => {
  it('removes duplicate citations', () => {
    const citations: FileCitationAnnotation[] = [
      { type: 'file_citation', index: 10, file_id: 'file-abc', filename: 'doc.pdf' },
      { type: 'file_citation', index: 10, file_id: 'file-abc', filename: 'doc.pdf' },
      { type: 'file_citation', index: 20, file_id: 'file-xyz', filename: 'doc.pdf' },
    ];

    const deduplicated = deduplicateCitations(citations);

    expect(deduplicated).toHaveLength(2);
    expect(deduplicated[0]).toMatchObject({ index: 10, file_id: 'file-abc' });
    expect(deduplicated[1]).toMatchObject({ index: 20, file_id: 'file-xyz' });
  });

  it('keeps citations with same file_id but different index', () => {
    const citations: FileCitationAnnotation[] = [
      { type: 'file_citation', index: 10, file_id: 'file-abc', filename: 'doc.pdf' },
      { type: 'file_citation', index: 20, file_id: 'file-abc', filename: 'doc.pdf' },
    ];

    const deduplicated = deduplicateCitations(citations);
    expect(deduplicated).toHaveLength(2);
  });

  it('handles empty array', () => {
    expect(deduplicateCitations([])).toEqual([]);
  });
});
