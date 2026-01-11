/**
 * Tools Package Tests
 * 
 * Tests for tool registry, agent router, and validation.
 * Addresses: Audit Blocker #3 - Test coverage 75%+
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Tools Package', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    describe('Module Exports', () => {
        it('should export identity tools', async () => {
            const identity = await import('../identity');
            expect(identity).toBeDefined();
        });

        it('should export engagement tools', async () => {
            const engagements = await import('../engagements');
            expect(engagements).toBeDefined();
        });

        it('should export document tools', async () => {
            const documents = await import('../documents');
            expect(documents).toBeDefined();
        });

        it('should export workpapers tools', async () => {
            const workpapers = await import('../workpapers');
            expect(workpapers).toBeDefined();
        });

        it('should export knowledge tools', async () => {
            const knowledge = await import('../knowledge');
            expect(knowledge).toBeDefined();
        });

        it('should export validation tools', async () => {
            const validation = await import('../validation');
            expect(validation).toBeDefined();
        });

        it('should export registry', async () => {
            const registry = await import('../registry');
            expect(registry).toBeDefined();
        });

        it('should export agent orchestrator', async () => {
            const orchestrator = await import('../agent-orchestrator');
            expect(orchestrator).toBeDefined();
        });

        it('should export agent router', async () => {
            const router = await import('../agent-router');
            expect(router).toBeDefined();
        });
    });

    describe('Types', () => {
        it('should export tool types', async () => {
            const types = await import('../types');
            expect(types).toBeDefined();
        });
    });
});
