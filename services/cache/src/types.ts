export type CacheKeySegment = string | number | boolean | null | undefined;

export interface CacheClientSetOptions {
  ttlSeconds?: number | null;
}

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: CacheClientSetOptions): Promise<void>;
  del(keys: string | string[]): Promise<void>;
  ttl(key: string): Promise<number | null>;
  disconnect(): Promise<void>;
}

export interface CacheSerializer<T> {
  serialize(value: T): string;
  deserialize(payload: string): T;
}

export interface CacheManagerOptions {
  client: CacheClient;
  keyPrefix?: string;
  defaultSerializer?: CacheSerializer<unknown>;
  defaultTtlSeconds?: number | null;
}

export interface CachePolicy {
  useCase: CacheUseCase;
  ttlSeconds: number;
}

export type CacheUseCase =
  | 'controls'
  | 'groupComponents'
  | 'otherInformationDocs'
  | 'specialists';

export interface CacheWithLoaderOptions<T> {
  key: CacheKeySegment[];
  loader: () => Promise<T>;
  serializer?: CacheSerializer<T>;
  ttlSeconds?: number | null;
  skipCache?: boolean;
}

export interface CacheInvalidateOptions {
  key: CacheKeySegment[];
}
