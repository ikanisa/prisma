import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  attachQueryLogger,
  createServicePrismaClient,
  determineLogLevels,
  type PrismaClientConstructor,
  type PrismaClientLike,
  __setPrismaClientConstructorForTests,
} from '../../prisma/client';

describe('determineLogLevels', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('enables query logging when explicitly requested', () => {
    expect(determineLogLevels(true)).toEqual(['error', 'warn', 'query']);
    expect(determineLogLevels(false)).toEqual(['error', 'warn']);
  });

  it('checks environment overrides', () => {
    process.env.RAG_PRISMA_LOG_QUERIES = 'true';
    expect(determineLogLevels()).toContain('query');

    process.env.RAG_PRISMA_LOG_QUERIES = 'false';
    expect(determineLogLevels()).not.toContain('query');
  });
});

describe('attachQueryLogger', () => {
  it('forwards query payloads to provided logger', () => {
    const eventListener = vi.fn<(payload: unknown, cb: (payload: unknown) => void) => void>();
    const client: PrismaClientLike = {
      $on: eventListener,
    };
    const logger = vi.fn();

    attachQueryLogger(client, logger, { fallbackToConsole: false });

    expect(eventListener).toHaveBeenCalledWith('query', expect.any(Function));
    const handler = eventListener.mock.calls[0][1];

    handler({ query: 'SELECT 1', params: '[]', duration: 10 });

    expect(logger).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'SELECT 1', params: '[]', durationMs: 10 }),
    );
  });
});

describe('createServicePrismaClient', () => {
  afterEach(() => {
    __setPrismaClientConstructorForTests(undefined);
  });

  it('configures query event logging when enabled', () => {
    const on = vi.fn();
    const ctor: PrismaClientConstructor = vi.fn(() => ({ $on: on }));
    __setPrismaClientConstructorForTests(ctor);

    const client = createServicePrismaClient({ logQueries: true });

    expect(ctor).toHaveBeenCalledWith({
      log: [
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'query', emit: 'event' },
      ],
    });
    expect(client).toEqual({ $on: on });
    expect(on).toHaveBeenCalledWith('query', expect.any(Function));
  });

  it('forces query event emission when a logger is provided', () => {
    const on = vi.fn();
    const ctor: PrismaClientConstructor = vi.fn(() => ({ $on: on }));
    __setPrismaClientConstructorForTests(ctor);

    createServicePrismaClient({ logQueries: false, queryLogger: vi.fn() });

    expect(ctor).toHaveBeenCalledWith({
      log: [
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'query', emit: 'event' },
      ],
    });
    expect(on).toHaveBeenCalledWith('query', expect.any(Function));
  });
});
