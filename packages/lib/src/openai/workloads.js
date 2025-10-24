import { getOpenAiBaseUrl } from './url.js';
const WORKLOAD_ENV_CONFIG = {
    default: {
        apiKeyEnv: 'OPENAI_API_KEY',
        organizationEnv: 'OPENAI_ORG_ID',
        userAgentEnv: 'OPENAI_USER_AGENT_TAG',
        requestTagsEnv: 'OPENAI_REQUEST_TAGS',
        quotaTagEnv: 'OPENAI_REQUEST_QUOTA_TAG',
    },
    'finance-prod': {
        apiKeyEnv: 'OPENAI_API_KEY_FINANCE_PROD',
        organizationEnv: 'OPENAI_ORG_ID_FINANCE_PROD',
        userAgentEnv: 'OPENAI_USER_AGENT_TAG_FINANCE',
        requestTagsEnv: 'OPENAI_REQUEST_TAGS_FINANCE_PROD',
        quotaTagEnv: 'OPENAI_REQUEST_QUOTA_TAG_FINANCE_PROD',
    },
    'finance-staging': {
        apiKeyEnv: 'OPENAI_API_KEY_FINANCE_STAGING',
        organizationEnv: 'OPENAI_ORG_ID_FINANCE_STAGING',
        userAgentEnv: 'OPENAI_USER_AGENT_TAG_FINANCE',
        requestTagsEnv: 'OPENAI_REQUEST_TAGS_FINANCE_STAGING',
        quotaTagEnv: 'OPENAI_REQUEST_QUOTA_TAG_FINANCE_STAGING',
    },
};
function readEnv(envName) {
    if (!envName)
        return null;
    const value = process.env[envName];
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function parseTags(raw) {
    if (!raw) {
        return [];
    }
    return raw
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
}
export function readOpenAiWorkloadEnv(workload = 'default') {
    const envConfig = WORKLOAD_ENV_CONFIG[workload];
    const apiKey = readEnv(envConfig.apiKeyEnv) ?? readEnv('OPENAI_API_KEY');
    const organization = readEnv(envConfig.organizationEnv) ?? readEnv('OPENAI_ORG_ID');
    const userAgentTag = readEnv(envConfig.userAgentEnv) ?? readEnv('OPENAI_USER_AGENT_TAG');
    const requestTags = parseTags(readEnv(envConfig.requestTagsEnv) ?? readEnv('OPENAI_REQUEST_TAGS'));
    const quotaTag = readEnv(envConfig.quotaTagEnv) ?? readEnv('OPENAI_REQUEST_QUOTA_TAG');
    return {
        apiKey,
        organization,
        userAgentTag,
        requestTags,
        quotaTag,
        baseUrl: getOpenAiBaseUrl(),
    };
}
export function getOpenAiWorkloadConfig(workload = 'default') {
    const envValues = readOpenAiWorkloadEnv(workload);
    if (!envValues.apiKey) {
        const expected = WORKLOAD_ENV_CONFIG[workload].apiKeyEnv ?? 'OPENAI_API_KEY';
        throw new Error(`OpenAI API key is not configured for workload "${workload}". Set ${expected} or OPENAI_API_KEY.`);
    }
    return { ...envValues, apiKey: envValues.apiKey };
}
export function resolveFinanceWorkloadKey() {
    const override = process.env.OPENAI_FINANCE_WORKLOAD?.trim();
    if (override === 'finance-prod' || override === 'finance-staging') {
        return override;
    }
    const nodeEnv = (process.env.NODE_ENV ?? 'development').toLowerCase();
    return nodeEnv === 'production' ? 'finance-prod' : 'finance-staging';
}
