import type {
  SamplingAttributeRequest,
  SamplingAttributeResult,
  SamplingAttributeStatus,
  SamplingRequest,
  SamplingResponse,
  SamplingRunStatus,
} from './types';

export type SamplingClientMode = 'demo' | 'live';

export interface SamplingClientOptions {
  baseUrl?: string;
  planBaseUrl?: string;
  mode?: SamplingClientMode;
  fetch?: typeof fetch;
  now?: () => Date;
}

export class SamplingServiceError extends Error {
  readonly statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'SamplingServiceError';
    this.statusCode = statusCode;
  }
}

export interface SamplingClient {
  requestAttributeSamples(request: SamplingRequest): Promise<SamplingResponse>;
}

const LOCAL_DEMO_ENV_VALUES = new Set(['local', 'demo']);
const DEFAULT_PLAN_BASE_URL = 'https://sampling.local';

export function createSamplingClient(options: SamplingClientOptions = {}): SamplingClient {
  const fetchImpl = options.fetch ?? fetch;
  const resolveNow = options.now ?? (() => new Date());
  const mode = resolveMode(options);
  const planBaseUrl = options.planBaseUrl ?? options.baseUrl ?? DEFAULT_PLAN_BASE_URL;

  return {
    async requestAttributeSamples(request) {
      validateRequest(request);
      const now = resolveNow();

      if (mode === 'demo') {
        return buildDeterministicResponse(request, now, planBaseUrl);
      }

      if (!options.baseUrl) {
        throw new SamplingServiceError('Sampling service base URL is not configured');
      }

      const url = buildServiceUrl(options.baseUrl, request.controlId, request.testPlanId);
      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ attributes: request.attributes }),
        });
      } catch (error) {
        throw new SamplingServiceError(`Failed to reach Sampling C1 service: ${(error as Error).message}`);
      }

      if (!response.ok) {
        let message = `Sampling service responded with status ${response.status}`;
        try {
          const payload = await response.json();
          if (payload && typeof payload.error === 'string' && payload.error.trim()) {
            message = payload.error.trim();
          }
        } catch {
          // ignore JSON parse errors and keep default message
        }
        throw new SamplingServiceError(message, response.status);
      }

      let parsed: unknown;
      try {
        parsed = await response.json();
      } catch (error) {
        throw new SamplingServiceError(`Unable to parse Sampling C1 response: ${(error as Error).message}`);
      }

      return normaliseServiceResponse(parsed, request, planBaseUrl, now);
    },
  };
}

function resolveMode(options: SamplingClientOptions): SamplingClientMode {
  if (options.mode) {
    return options.mode;
  }

  const explicitEnv = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV;
  if (explicitEnv && LOCAL_DEMO_ENV_VALUES.has(explicitEnv.toLowerCase())) {
    return 'demo';
  }

  return process.env.NODE_ENV === 'production' ? 'live' : 'demo';
}

function validateRequest(request: SamplingRequest) {
  if (!request || typeof request !== 'object') {
    throw new SamplingServiceError('Sampling request must be an object');
  }

  if (typeof request.controlId !== 'string' || !request.controlId.trim()) {
    throw new SamplingServiceError('controlId is required');
  }

  if (typeof request.testPlanId !== 'string' || !request.testPlanId.trim()) {
    throw new SamplingServiceError('testPlanId is required');
  }

  if (!Array.isArray(request.attributes) || request.attributes.length === 0) {
    throw new SamplingServiceError('At least one attribute must be provided for sampling');
  }

  for (const attribute of request.attributes) {
    if (!attribute || typeof attribute !== 'object') {
      throw new SamplingServiceError('Attribute definitions must be objects');
    }

    if (typeof attribute.attributeKey !== 'string' || !attribute.attributeKey.trim()) {
      throw new SamplingServiceError('Each attribute must include an attributeKey');
    }

    if (typeof attribute.population !== 'number' || !Number.isFinite(attribute.population) || attribute.population <= 0) {
      throw new SamplingServiceError('Each attribute must include a positive population value');
    }
  }
}

function buildDeterministicResponse(request: SamplingRequest, now: Date, planBaseUrl: string): SamplingResponse {
  const seed = hashString(`${request.controlId}|${request.testPlanId}`);
  const samplePlanRef = `DEMO-${seed.toString(36).toUpperCase().padStart(8, '0').slice(0, 8)}`;
  const attributes: SamplingAttributeResult[] = request.attributes.map((attribute, index) => {
    const attributeSeed = hashString(`${seed}:${attribute.attributeKey}:${index}`);
    const sampleSize = Math.max(1, Math.min(attribute.population, (attributeSeed % 5) + 1));
    const status: SamplingAttributeStatus = attributeSeed % 5 === 0 ? 'failed' : 'sampled';
    const samples = status === 'sampled'
      ? Array.from({ length: sampleSize }, (_, position) => ({
        recordId: `${attribute.attributeKey}-${String(position + 1).padStart(3, '0')}`,
        description: `Sample ${position + 1} for ${attribute.attributeKey}`,
      }))
      : [];

    return {
      attributeKey: attribute.attributeKey,
      description: attribute.description,
      population: attribute.population,
      sampleSize,
      status,
      samples,
      error: status === 'failed' ? 'Attribute sampling failed quality checks' : undefined,
    };
  });

  const status = deriveRunStatus(undefined, attributes);

  return {
    samplePlanRef,
    samplePlanUrl: buildPlanUrl(planBaseUrl, samplePlanRef),
    status,
    attributes,
    requestedAt: now.toISOString(),
  };
}

function buildServiceUrl(baseUrl: string, controlId: string, testPlanId: string): string {
  const trimmedBase = baseUrl.replace(/\/$/, '');
  return `${trimmedBase}/controls/${encodeURIComponent(controlId)}/test-plans/${encodeURIComponent(testPlanId)}/samples`;
}

function normaliseServiceResponse(
  payload: unknown,
  request: SamplingRequest,
  planBaseUrl: string,
  now: Date,
): SamplingResponse {
  if (!payload || typeof payload !== 'object') {
    throw new SamplingServiceError('Sampling service response was empty or malformed');
  }

  const body = payload as Record<string, unknown>;
  const rawRef = body.samplePlanRef;
  if (typeof rawRef !== 'string' || !rawRef.trim()) {
    throw new SamplingServiceError('Sampling service response missing samplePlanRef');
  }
  const samplePlanRef = rawRef.trim();

  const attributesPayload = Array.isArray(body.attributes) ? body.attributes : [];
  if (!Array.isArray(body.attributes) || attributesPayload.length === 0) {
    throw new SamplingServiceError('Sampling service response missing attribute sampling results');
  }

  const attributes: SamplingAttributeResult[] = attributesPayload.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new SamplingServiceError('Sampling service returned an invalid attribute result');
    }
    const result = item as Record<string, unknown>;
    const requestAttribute = request.attributes[index] ?? request.attributes.find(attr => attr.attributeKey === result.attributeKey);

    const attributeKeyValue = typeof result.attributeKey === 'string' && result.attributeKey.trim()
      ? result.attributeKey.trim()
      : requestAttribute?.attributeKey;

    if (!attributeKeyValue) {
      throw new SamplingServiceError('Sampling attribute result missing attributeKey');
    }

    const populationValue = typeof result.population === 'number' && Number.isFinite(result.population)
      ? result.population
      : requestAttribute?.population ?? 0;

    const statusValue = result.status === 'failed' ? 'failed' : 'sampled';

    const samplesPayload = Array.isArray(result.samples) ? result.samples : [];
    const samples = samplesPayload.map((sample, sampleIndex) => {
      if (!sample || typeof sample !== 'object') {
        throw new SamplingServiceError('Sampling service returned an invalid sample entry');
      }
      const entry = sample as Record<string, unknown>;
      const recordId = typeof entry.recordId === 'string' && entry.recordId.trim()
        ? entry.recordId.trim()
        : typeof entry.id === 'string' && entry.id.trim()
          ? entry.id.trim()
          : `${attributeKeyValue}-${sampleIndex + 1}`;
      const description = typeof entry.description === 'string' && entry.description.trim()
        ? entry.description.trim()
        : typeof entry.label === 'string' && entry.label.trim()
          ? entry.label.trim()
          : `Sample ${sampleIndex + 1}`;
      return { recordId, description };
    });

    const sampleSizeValue = typeof result.sampleSize === 'number' && Number.isFinite(result.sampleSize)
      ? result.sampleSize
      : samples.length;

    const errorValue = typeof result.error === 'string' && result.error.trim()
      ? result.error.trim()
      : undefined;

    return {
      attributeKey: attributeKeyValue,
      description: requestAttribute?.description,
      population: populationValue,
      sampleSize: sampleSizeValue,
      status: statusValue,
      samples,
      error: errorValue,
    };
  });

  const status = deriveRunStatus(body.status, attributes);
  const rawUrl = typeof body.samplePlanUrl === 'string' && body.samplePlanUrl.trim() ? body.samplePlanUrl.trim() : undefined;
  const requestedAtValue = typeof body.requestedAt === 'string' && body.requestedAt.trim()
    ? new Date(body.requestedAt).toISOString()
    : now.toISOString();

  return {
    samplePlanRef,
    samplePlanUrl: rawUrl ?? buildPlanUrl(planBaseUrl, samplePlanRef),
    status,
    attributes,
    requestedAt: requestedAtValue,
  };
}

function buildPlanUrl(planBaseUrl: string, reference: string): string {
  const trimmed = planBaseUrl.replace(/\/$/, '');
  try {
    return new URL(`/plans/${encodeURIComponent(reference)}`, ensureUrlHasProtocol(trimmed)).toString();
  } catch {
    return `${trimmed}/plans/${encodeURIComponent(reference)}`;
  }
}

function ensureUrlHasProtocol(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value.replace(/^\/*/, '')}`;
}

function deriveRunStatus(statusValue: unknown, attributes: SamplingAttributeResult[]): SamplingRunStatus {
  if (typeof statusValue === 'string') {
    const normalised = statusValue.toLowerCase();
    if (normalised === 'completed' || normalised === 'complete') {
      return 'completed';
    }
    if (normalised === 'failed' || normalised === 'error') {
      return 'failed';
    }
    if (normalised === 'partial' || normalised === 'incomplete') {
      return 'partial';
    }
  }

  const hasSampled = attributes.some(attribute => attribute.status === 'sampled');
  const hasFailures = attributes.some(attribute => attribute.status === 'failed');

  if (hasFailures && hasSampled) {
    return 'partial';
  }

  if (hasFailures) {
    return 'failed';
  }

  return 'completed';
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}
