export type SamplingRunStatus = 'completed' | 'partial' | 'failed';

export type SamplingAttributeStatus = 'sampled' | 'failed';

export interface SamplingAttributeRequest {
  attributeKey: string;
  population: number;
  description?: string;
}

export interface SamplingAttributeSample {
  recordId: string;
  description: string;
}

export interface SamplingAttributeResult extends SamplingAttributeRequest {
  sampleSize: number;
  status: SamplingAttributeStatus;
  samples: SamplingAttributeSample[];
  error?: string;
}

export interface SamplingResponse {
  samplePlanRef: string;
  samplePlanUrl: string;
  status: SamplingRunStatus;
  attributes: SamplingAttributeResult[];
  requestedAt: string;
}

export interface SamplingRequest {
  controlId: string;
  testPlanId: string;
  attributes: SamplingAttributeRequest[];
}

export interface ControlTestRun extends SamplingResponse {
  id: string;
  controlId: string;
  testPlanId: string;
  createdAt: string;
  updatedAt: string;
}
