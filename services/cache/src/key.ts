import type { CacheKeySegment } from './types.js';

const SEPARATOR = ':';

const normaliseSegment = (segment: CacheKeySegment): string | null => {
  if (segment === undefined || segment === null) {
    return null;
  }
  if (typeof segment === 'boolean') {
    return segment ? '1' : '0';
  }
  if (typeof segment === 'number') {
    return Number.isFinite(segment) ? segment.toString(10) : null;
  }
  if (typeof segment === 'string') {
    const trimmed = segment.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

export const createCacheKey = (
  base: string,
  segments: CacheKeySegment[],
): string => {
  const normalisedSegments = segments
    .map((segment) => normaliseSegment(segment))
    .filter((segment): segment is string => Boolean(segment));

  const resolvedSegments = [base, ...normalisedSegments];
  return resolvedSegments.join(SEPARATOR);
};
