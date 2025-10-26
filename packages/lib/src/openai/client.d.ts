import OpenAI, { type ClientOptions } from 'openai';
import { type OpenAiWorkloadKey } from './workloads.js';
export declare function getOpenAIClient(options?: ClientOptions): OpenAI;
export declare function getOpenAIClientForWorkload(workload: OpenAiWorkloadKey, options?: ClientOptions): OpenAI;
export declare function refreshOpenAIClient(options?: ClientOptions): OpenAI;
export declare function refreshOpenAIClientForWorkload(workload: OpenAiWorkloadKey, options?: ClientOptions): OpenAI;
export declare function withOpenAIClient<T>(callback: (client: OpenAI) => Promise<T> | T): Promise<T> | T;
export declare function withOpenAIClientForWorkload<T>(workload: OpenAiWorkloadKey, callback: (client: OpenAI) => Promise<T> | T, options?: ClientOptions): Promise<T> | T;
export type { OpenAiWorkloadKey } from './workloads.js';
//# sourceMappingURL=client.d.ts.map