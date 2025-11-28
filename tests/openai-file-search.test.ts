import { describe, expect, it, vi } from 'vitest';

import { runOpenAiFileSearch } from '@prisma-glow/lib/openai/file-search';

describe('runOpenAiFileSearch', () => {
  it('builds the request and normalises results', async () => {
    const createMock = vi.fn().mockResolvedValue({
      output: [
        {
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                results: [
                  {
                    text: ' Revenue guidance for IFRS 15 ',
                    score: 0.92,
                    citation: {
                      file_id: 'file-123',
                      filename: 'ifrs15.pdf',
                      url: 'https://example.com/ifrs15',
                      chunk_index: 2,
                    },
                  },
                  {
                    text: ' IFRS 9 impairment checklist ',
                    similarity: '0.81',
                    source: {
                      doc_id: 'doc-9',
                      chunkId: '4',
                      name: 'ifrs9.md',
                    },
                  },
                ],
              }),
            },
          ],
        },
      ],
      usage: { total_tokens: 123 },
    });

    const result = await runOpenAiFileSearch({
      client: { responses: { create: createMock } } as any,
      query: 'Summarise IFRS revenue recognition updates',
      vectorStoreId: 'vs_test',
      model: 'gpt-4.1-mini',
      topK: 4,
      filters: { category: { eq: 'audit' } },
      includeResults: true,
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4.1-mini',
        include: ['file_search_call.results'],
        tools: [
          expect.objectContaining({
            type: 'file_search',
            vector_store_ids: ['vs_test'],
            max_num_results: 4,
            filters: { category: { eq: 'audit' } },
          }),
        ],
      })
    );

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      text: 'Revenue guidance for IFRS 15',
      score: 0.92,
      citation: {
        documentId: 'file-123',
        fileId: 'file-123',
        filename: 'ifrs15.pdf',
        url: 'https://example.com/ifrs15',
        chunkIndex: 2,
      },
    });

    expect(result.items[1]).toMatchObject({
      text: 'IFRS 9 impairment checklist',
      score: 0.81,
      citation: {
        documentId: 'doc-9',
        filename: 'ifrs9.md',
        chunkIndex: 4,
      },
    });
  });

  it('throws when the response does not contain output text', async () => {
    const createMock = vi.fn().mockResolvedValue({ output: [] });

    await expect(
      runOpenAiFileSearch({
        client: { responses: { create: createMock } } as any,
        query: 'test query',
        vectorStoreId: 'vs_missing',
        model: 'gpt-4.1-mini',
      })
    ).rejects.toThrow(/missing output/);
  });
});
