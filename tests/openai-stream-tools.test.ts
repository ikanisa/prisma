import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../services/rag/index.ts', () => ({}));

const responsesCreateMock = vi.fn();
const embeddingsCreateMock = vi.fn();

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      responses: { create: responsesCreateMock },
      embeddings: { create: embeddingsCreateMock },
    })),
  };
});

import '../services/rag/openai-stream';

describe('tool streaming SSE endpoint', () => {
  beforeEach(() => {
    responsesCreateMock.mockReset();
    embeddingsCreateMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('placeholder - integration tests should be added when streaming enabled end-to-end', () => {
    expect(true).toBe(true);
  });
});
