export type SerializedPayload = string;

interface Envelope<T> {
  v: T;
}

export function serializeValue<T>(value: T): SerializedPayload {
  return JSON.stringify({ v: value } as Envelope<T>);
}

export function deserializeValue<T>(payload: SerializedPayload | null): T | undefined {
  if (!payload) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(payload) as Envelope<T>;
    if (Object.prototype.hasOwnProperty.call(parsed, 'v')) {
      return parsed.v;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
