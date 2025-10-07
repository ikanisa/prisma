import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContext = {
  traceId: string;
  requestId: string;
  orgId?: string;
  userId?: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function setRequestContextValue<K extends keyof RequestContext>(key: K, value: RequestContext[K]): void {
  const store = storage.getStore();
  if (!store) return;
  (store as RequestContext)[key] = value;
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function getTraceId(): string | undefined {
  return storage.getStore()?.traceId;
}

export function bindOrgContext(orgId: string, userId?: string) {
  setRequestContextValue('orgId', orgId);
  if (userId) {
    setRequestContextValue('userId', userId);
  }
}
