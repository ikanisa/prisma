export interface AnalyticsContext {
  requestId?: string;
  traceId?: string;
  spanId?: string;
}

export interface AnalyticsEvent {
  event: string;
  service?: string;
  source: string;
  orgId?: string;
  actorId?: string;
  timestamp?: string;
  tags?: string[];
  properties?: Record<string, unknown>;
  context?: AnalyticsContext;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsClientOptions {
  endpoint?: string;
  apiKey?: string;
  service?: string;
  environment?: string;
  onError?: (error: unknown, event: AnalyticsEvent) => void;
}

export interface AnalyticsClient {
  record(event: AnalyticsEvent): Promise<void>;
}

export declare function normaliseEvent(event: AnalyticsEvent, defaults?: Partial<AnalyticsEvent>): AnalyticsEvent;
export declare function createAnalyticsClient(options?: AnalyticsClientOptions): AnalyticsClient;
export declare const schema: unknown;
