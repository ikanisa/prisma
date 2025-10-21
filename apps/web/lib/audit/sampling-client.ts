import 'server-only';
import crypto from 'node:crypto';
import { env } from '@/src/env.server';

export class SamplingServiceError extends Error {
  readonly statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'SamplingServiceError';
    this.statusCode = statusCode;
  }
}

interface SamplingClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export type SamplingPlanItem = {
  id: string;
  populationRef?: string;
  description?: string;
  stratum?: string;
};

export type SamplingPlan = {
  id: string;
  size: number;
  generatedAt: string;
  items: SamplingPlanItem[];
  source: 'service' | 'deterministic-fixture';
};

export type SamplingPlanRequest = {
  orgId: string;
  engagementId: string;
  controlId: string;
  requestedSampleSize: number;
  cycle?: string;
  objective?: string;
};

export class SamplingClient {
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(options: SamplingClientOptions = {}) {
    this.baseUrl = options.baseUrl?.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async requestPlan(request: SamplingPlanRequest): Promise<SamplingPlan> {
    if (!this.baseUrl) {
      // No remote configured → deterministic fixture
      return this.generateDeterministicPlan(request);
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          orgId: request.orgId,
          engagementId: request.engagementId,
          controlId: request.controlId,
          sampleSize: request.requestedSampleSize,
          cycle: request.cycle,
          objective: request.objective,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new SamplingServiceError(
          `Sampling service responded with status ${response.status}`,
          response.status
        );
      }

      const body = (await response.json()) as {
        id: string;
        sampleSize: number;
        items?: Array<{ id: string; populationRef?: string; description?: string; stratum?: string }>;
        generatedAt?: string;
      };

      if (!body?.id || !body.sampleSize) {
        throw new SamplingServiceError('Sampling service response missing id or sampleSize');
      }

      // Ensure we always return the requested number of items (pad deterministically if needed)
      const items = (body.items ?? []).slice(0, request.requestedSampleSize);
      if (items.length < request.requestedSampleSize) {
        const padding = this.generateDeterministicPlan(request).items;
        items.push(...padding.slice(items.length));
      }

      return {
        id: body.id,
        size: items.length,
        generatedAt: body.generatedAt ?? new Date().toISOString(),
        items,
        source: 'service',
      };
    } catch (error) {
      console.warn('Sampling service unavailable, falling back to deterministic fixture.', error);
      return this.generateDeterministicPlan(request);
    }
  }

  private generateDeterministicPlan(request: SamplingPlanRequest): SamplingPlan {
    const seed = `${request.controlId}:${request.engagementId}:${request.requestedSampleSize}`;
    const hash = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 12);
    const planId = `fixture-${hash}`;

    const items: SamplingPlanItem[] = Array.from(
      { length: request.requestedSampleSize },
      (_, index) => ({
        id: `${planId}-item-${index + 1}`,
        populationRef: `POP-${((index + 37) % 997) + 1}`,
        description: `Deterministic fixture item ${index + 1}`,
        stratum: index % 2 === 0 ? 'Primary' : 'Secondary',
      })
    );

    return {
      id: planId,
      size: items.length,
      generatedAt: new Date().toISOString(),
      items,
      source: 'deterministic-fixture',
    };
  }
}

let cachedClient: SamplingClient | null = null;

export function getSamplingClient(): SamplingClient {
  if (!cachedClient) {
    cachedClient = new SamplingClient({
      baseUrl: env.SAMPLING_C1_BASE_URL ?? undefined,
      apiKey: env.SAMPLING_C1_API_KEY ?? undefined,
    });
  }
  return cachedClient;
}
