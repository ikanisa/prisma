export type ClientEventLevel = 'info' | 'warn' | 'error';

export interface ClientEvent {
  name: string;
  level?: ClientEventLevel;
  data?: Record<string, unknown>;
}

const EVENT_BUFFER_KEY = '__aurora_client_events__';
const DEFAULT_LEVEL: ClientEventLevel = 'info';

function pushToBuffer(event: ClientEvent & { timestamp: number }) {
  if (typeof window === 'undefined') return;
  const existing = (window as any)[EVENT_BUFFER_KEY] as Array<typeof event> | undefined;
  const buffer = Array.isArray(existing) ? existing.slice(-49) : [];
  buffer.push(event);
  (window as any)[EVENT_BUFFER_KEY] = buffer;
  window.dispatchEvent(new CustomEvent('aurora:client-event', { detail: event }));
}

export function recordClientEvent(event: ClientEvent) {
  pushToBuffer({ ...event, level: event.level ?? DEFAULT_LEVEL, timestamp: Date.now() });
}

export function recordClientError(event: ClientEvent & { error: unknown }) {
  recordClientEvent({
    name: event.name,
    level: 'error',
    data: {
      ...(event.data ?? {}),
      message: event.error instanceof Error ? event.error.message : String(event.error),
    },
  });
}
