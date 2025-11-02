import { describe, expect, it } from 'vitest';
import { deserializeValue, serializeValue } from '../serialization';

describe('cache serialization helpers', () => {
  it('round-trips complex payloads', () => {
    const payload = { foo: 'bar', nested: { count: 2 }, list: [1, 2, 3], flag: false };
    const encoded = serializeValue(payload);
    expect(deserializeValue<typeof payload>(encoded)).toEqual(payload);
  });

  it('returns undefined for malformed data', () => {
    expect(deserializeValue('not-json')).toBeUndefined();
    expect(deserializeValue(null)).toBeUndefined();
  });
});
