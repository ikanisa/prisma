/**
 * Vitest test setup file
 */

// Mock OpenAI for tests
import { vi, beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(() => {
    // Suppress console.log during tests
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
});

afterAll(() => {
    vi.restoreAllMocks();
});
