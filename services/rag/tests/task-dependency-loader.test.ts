import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createTaskDependencyLoader,
  resolveAssignableTaskIds,
} from '../prisma/task-dependency-loader.js';

describe('task dependency loader', () => {
  const createQueryBuilder = (rows: Array<{ id: string; status: string }>) => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      in: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };
    return builder;
  };

  beforeEach(() => {
    vi.useRealTimers();
  });

  it('loads dependencies in a single batched query and caches results', async () => {
    const builder = createQueryBuilder([
      { id: 'dep-1', status: 'COMPLETED' },
    ]);
    const from = vi.fn().mockReturnValue(builder);

    const loader = createTaskDependencyLoader({
      supabase: { from } as any,
    });

    const first = await loader.loadMany(['dep-1', 'dep-2']);

    expect(from).toHaveBeenCalledTimes(1);
    expect(builder.select).toHaveBeenCalledWith('id, status');
    expect(builder.in).toHaveBeenCalledWith('id', ['dep-1', 'dep-2']);
    expect(builder.eq).toHaveBeenCalledWith('status', 'COMPLETED');
    expect(first.get('dep-1')).toBe(true);
    expect(first.get('dep-2')).toBe(false);

    const second = await loader.loadMany(['dep-1']);
    expect(from).toHaveBeenCalledTimes(1);
    expect(second.get('dep-1')).toBe(true);
  });

  it('normalises identifiers and ignores empty dependency values', async () => {
    const builder = createQueryBuilder([]);
    const from = vi.fn().mockReturnValue(builder);

    const loader = createTaskDependencyLoader({
      supabase: { from } as any,
    });

    const result = await loader.loadMany(['  ', 'DEP-1']);
    expect(from).toHaveBeenCalledWith('agent_orchestration_tasks');
    expect(result.get('DEP-1')).toBe(false);
  });

  it('refreshes cached dependencies after the TTL expires', async () => {
    vi.useFakeTimers();

    const eq = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: 'dep-1', status: 'COMPLETED' }],
        error: null,
      })
      .mockResolvedValue({ data: [], error: null });

    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      in: vi.fn().mockImplementation(() => builder),
      eq,
    };

    const from = vi.fn().mockReturnValue(builder);

    const loader = createTaskDependencyLoader({
      supabase: { from } as any,
      cacheTtlMs: 1000,
    });

    const first = await loader.loadMany(['dep-1']);
    expect(first.get('dep-1')).toBe(true);
    expect(from).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1500);

    const second = await loader.loadMany(['dep-1']);
    expect(second.get('dep-1')).toBe(false);
    expect(from).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('determines assignable task identifiers with dependency batches', async () => {
    const loadMany = vi.fn().mockResolvedValue(
      new Map<string, boolean>([
        ['dep-1', true],
        ['dep-2', false],
      ]),
    );

    const assignable = await resolveAssignableTaskIds(
      [
        { id: 'task-1', depends_on: [] },
        { id: 'task-2', depends_on: ['dep-1'] },
        { id: 'task-3', depends_on: ['dep-2'] },
      ],
      { loadMany },
    );

    expect(loadMany).toHaveBeenCalledWith(['dep-1', 'dep-2']);
    expect(assignable).toEqual(['task-1', 'task-2']);
  });

  it('handles loader failures gracefully when resolving dependencies', async () => {
    const loadMany = vi.fn().mockRejectedValue(new Error('boom'));
    const onError = vi.fn();

    const assignable = await resolveAssignableTaskIds(
      [
        { id: 'task-1', depends_on: ['dep-1'] },
      ],
      { loadMany },
      onError,
    );

    expect(assignable).toEqual([]);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), { dependencyCount: 1 });
  });
});
