/**
 * Shared OpenAI Client Utility
 * 
 * Provides graceful OpenAI client initialization with:
 * - Lazy initialization (client created on first use)
 * - Graceful degradation when API key is missing
 * - Configurable fallback behavior
 * 
 * @package @prisma/ai-engine
 */

import OpenAI from 'openai';

// ============================================================================
// TYPES
// ============================================================================

export interface OpenAIClientOptions {
    /** OpenAI API key (defaults to OPENAI_API_KEY env var) */
    apiKey?: string;
    /** Organization ID */
    organization?: string;
    /** Whether to throw on missing API key (default: false) */
    throwOnMissing?: boolean;
    /** Model to use (default: gpt-4o-mini) */
    defaultModel?: string;
}

export interface OpenAIClientResult {
    /** The OpenAI client (null if unavailable) */
    client: OpenAI | null;
    /** Whether the client is available */
    available: boolean;
    /** Error message if client is unavailable */
    error?: string;
    /** Whether running in mock/stub mode */
    stubMode: boolean;
}

// ============================================================================
// LAZY SINGLETON
// ============================================================================

let _cachedClient: OpenAI | null = null;
let _initAttempted = false;
let _initError: string | null = null;

/**
 * Get a shared OpenAI client instance.
 * 
 * Creates the client lazily on first call, caches for subsequent calls.
 * Safe to call even if API key is missing.
 * 
 * @example
 * const { client, available } = getOpenAIClient();
 * if (available && client) {
 *   const response = await client.chat.completions.create({ ... });
 * } else {
 *   // Use fallback/rule-based logic
 * }
 */
export function getOpenAIClient(options: OpenAIClientOptions = {}): OpenAIClientResult {
    const {
        apiKey,
        organization,
        throwOnMissing = false,
    } = options;

    // Return cached client if available
    if (_initAttempted && !apiKey) {
        return {
            client: _cachedClient,
            available: _cachedClient !== null,
            error: _initError ?? undefined,
            stubMode: _cachedClient === null,
        };
    }

    // Attempt initialization
    try {
        const resolvedApiKey = apiKey || process.env.OPENAI_API_KEY;

        if (!resolvedApiKey) {
            if (throwOnMissing) {
                throw new Error('OPENAI_API_KEY is required but not configured');
            }
            _initAttempted = true;
            _initError = 'OPENAI_API_KEY not configured';
            return {
                client: null,
                available: false,
                error: _initError,
                stubMode: true,
            };
        }

        const client = new OpenAI({
            apiKey: resolvedApiKey,
            organization,
        });

        // Cache the client if using default (env var) key
        if (!apiKey) {
            _cachedClient = client;
            _initAttempted = true;
            _initError = null;
        }

        return {
            client,
            available: true,
            stubMode: false,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize OpenAI client';

        if (throwOnMissing) {
            throw error;
        }

        _initAttempted = true;
        _initError = errorMessage;

        return {
            client: null,
            available: false,
            error: errorMessage,
            stubMode: true,
        };
    }
}

/**
 * Create a new OpenAI client instance (not cached).
 * 
 * Use this when you need a client with specific configuration.
 * Returns null if API key is unavailable.
 */
export function createOpenAIClient(options: OpenAIClientOptions = {}): OpenAI | null {
    const result = getOpenAIClient({
        ...options,
        // Don't use cache for explicit creation
    });
    return result.client;
}

/**
 * Check if OpenAI is available without creating a client.
 */
export function isOpenAIAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
}

/**
 * Clear the cached client (useful for testing).
 */
export function resetOpenAIClient(): void {
    _cachedClient = null;
    _initAttempted = false;
    _initError = null;
}

// ============================================================================
// DEFAULT MODEL CONSTANTS
// ============================================================================

export const OPENAI_MODELS = {
    /** Fast, cost-effective model for simple tasks */
    MINI: 'gpt-4o-mini',
    /** Standard model for most tasks */
    STANDARD: 'gpt-4o',
    /** Most capable model for complex reasoning */
    ADVANCED: 'gpt-4-turbo',
    /** Legacy model (deprecated) */
    LEGACY: 'gpt-4',
} as const;

export const DEFAULT_MODEL = process.env.OPENAI_MODEL || OPENAI_MODELS.MINI;
