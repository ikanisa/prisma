export type OpenAiWorkloadKey = 'default' | 'finance-prod' | 'finance-staging';
export interface OpenAiWorkloadEnv {
    apiKey: string | null;
    organization: string | null;
    userAgentTag: string | null;
    requestTags: string[];
    quotaTag: string | null;
    baseUrl: string;
}
export interface OpenAiWorkloadConfig extends OpenAiWorkloadEnv {
    apiKey: string;
}
export declare function readOpenAiWorkloadEnv(workload?: OpenAiWorkloadKey): OpenAiWorkloadEnv;
export declare function getOpenAiWorkloadConfig(workload?: OpenAiWorkloadKey): OpenAiWorkloadConfig;
export declare function resolveFinanceWorkloadKey(): OpenAiWorkloadKey;
//# sourceMappingURL=workloads.d.ts.map