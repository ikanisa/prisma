/**
 * Test utilities for OpenAI API mocking
 * P1 FIX: Centralized mock API key handling to avoid hardcoded secrets in tests
 */

/**
 * Get a mock API key for testing.
 * Uses environment variable if available, otherwise returns a safe mock value.
 */
export const getTestApiKey = (): string => {
    return process.env.OPENAI_API_KEY ?? process.env.TEST_OPENAI_API_KEY ?? 'test-mock-api-key';
};

/**
 * Mock configuration for OpenAI client in tests
 */
export const getTestOpenAiConfig = () => ({
    apiKey: getTestApiKey(),
    baseURL: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
});

/**
 * Create mock Authorization header for tests
 */
export const getTestAuthHeader = (): string => {
    return `Bearer ${getTestApiKey()}`;
};
