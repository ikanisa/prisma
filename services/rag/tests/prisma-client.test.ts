import { describe, expect, it, vi } from 'vitest';
import {
  notifyQueryObservers,
  registerQueryObserver,
  type Prisma,
} from '../prisma/client.js';

describe('prisma client instrumentation', () => {
  it('invokes registered observers on query events', () => {
    const observer = vi.fn();
    const unregister = registerQueryObserver(observer);

    const event: Prisma.QueryEvent = {
      timestamp: new Date(),
      query: 'SELECT 1',
      params: '[]',
      duration: 5,
      target: 'db',
    };

    notifyQueryObservers(event);

    expect(observer).toHaveBeenCalledWith(event);

    unregister();
    notifyQueryObservers(event);
    expect(observer).toHaveBeenCalledTimes(1);
  });
});
