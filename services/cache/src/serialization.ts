import type { CacheSerializer } from './types.js';

export class CacheSerializationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'CacheSerializationError';
  }
}

export const jsonSerializer: CacheSerializer<unknown> = {
  serialize(value) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new CacheSerializationError('Failed to serialize value to JSON', error);
    }
  },
  deserialize(payload) {
    try {
      return JSON.parse(payload) as unknown;
    } catch (error) {
      throw new CacheSerializationError('Failed to deserialize JSON payload', error);
    }
  },
};

export const stringSerializer: CacheSerializer<string> = {
  serialize(value) {
    return value;
  },
  deserialize(payload) {
    return payload;
  },
};
