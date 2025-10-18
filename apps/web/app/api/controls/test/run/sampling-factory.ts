import { getSamplingClient as baseGetSamplingClient } from '@/lib/audit/sampling-client';

type SamplingClient = ReturnType<typeof baseGetSamplingClient>;

let samplingClientFactory: () => SamplingClient = () => baseGetSamplingClient();

export function setSamplingClientFactory(factory: (() => SamplingClient) | null): void {
  samplingClientFactory = factory ?? (() => baseGetSamplingClient());
}

export function resolveSamplingClient(): SamplingClient {
  return samplingClientFactory();
}
