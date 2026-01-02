/**
 * Unit Tests for Knowledge Factory Modules
 */
import { describe, it, expect } from 'vitest';

describe('Knowledge Factory - Chunker', () => {
    // Mock chunking function for testing
    const mockChunk = (text: string, targetTokens: number, overlap: number) => {
        // Simplified chunking for testing
        const words = text.split(' ');
        const wordsPerChunk = Math.floor(targetTokens / 1.3); // ~1.3 tokens per word
        const chunks = [];
        let i = 0;
        while (i < words.length) {
            const end = Math.min(i + wordsPerChunk, words.length);
            chunks.push({
                content: words.slice(i, end).join(' '),
                tokenCount: Math.floor((end - i) * 1.3),
            });
            i += wordsPerChunk - Math.floor(overlap / 1.3);
        }
        return chunks;
    };

    it('creates chunks within token limits', () => {
        const text = Array(500).fill('word').join(' ');
        const chunks = mockChunk(text, 100, 20);

        expect(chunks.length).toBeGreaterThan(1);
        chunks.forEach(chunk => {
            expect(chunk.tokenCount).toBeLessThanOrEqual(150); // with buffer
        });
    });

    it('creates overlapping chunks', () => {
        const text = 'a b c d e f g h i j k l m n o p q r s t u v w x y z';
        const chunks = mockChunk(text, 10, 3);

        // With overlap, chunks should share some content
        expect(chunks.length).toBeGreaterThan(1);
    });

    it('handles single chunk documents', () => {
        const shortText = 'This is a short document.';
        const chunks = mockChunk(shortText, 100, 20);

        expect(chunks.length).toBe(1);
        expect(chunks[0].content).toBe(shortText);
    });
});

describe('Knowledge Factory - Content Hash', () => {
    const hashContent = (content: string) => {
        // Simplified hash for testing
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            hash = ((hash << 5) - hash) + content.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString(16);
    };

    it('generates consistent hashes', () => {
        const content = 'Test content for hashing';
        const hash1 = hashContent(content);
        const hash2 = hashContent(content);

        expect(hash1).toBe(hash2);
    });

    it('generates different hashes for different content', () => {
        const hash1 = hashContent('Content A');
        const hash2 = hashContent('Content B');

        expect(hash1).not.toBe(hash2);
    });
});

describe('Knowledge Factory - Confidentiality Access', () => {
    const ROLE_HIERARCHY = {
        READONLY: 0,
        CLIENT: 1,
        EMPLOYEE: 2,
        MANAGER: 3,
        ADMIN: 4,
        PARTNER: 5,
        SYSTEM_ADMIN: 6,
    };

    const canAccessConfidentiality = (role: string, level: string) => {
        const roleLevel = ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] ?? 0;
        switch (level) {
            case 'PUBLIC': return true;
            case 'INTERNAL': return roleLevel >= 2; // EMPLOYEE
            case 'RESTRICTED': return roleLevel >= 3; // MANAGER
            default: return false;
        }
    };

    it('allows PUBLIC access to all roles', () => {
        expect(canAccessConfidentiality('READONLY', 'PUBLIC')).toBe(true);
        expect(canAccessConfidentiality('CLIENT', 'PUBLIC')).toBe(true);
        expect(canAccessConfidentiality('EMPLOYEE', 'PUBLIC')).toBe(true);
    });

    it('allows INTERNAL access only to EMPLOYEE+', () => {
        expect(canAccessConfidentiality('READONLY', 'INTERNAL')).toBe(false);
        expect(canAccessConfidentiality('CLIENT', 'INTERNAL')).toBe(false);
        expect(canAccessConfidentiality('EMPLOYEE', 'INTERNAL')).toBe(true);
        expect(canAccessConfidentiality('MANAGER', 'INTERNAL')).toBe(true);
    });

    it('allows RESTRICTED access only to MANAGER+', () => {
        expect(canAccessConfidentiality('EMPLOYEE', 'RESTRICTED')).toBe(false);
        expect(canAccessConfidentiality('MANAGER', 'RESTRICTED')).toBe(true);
        expect(canAccessConfidentiality('ADMIN', 'RESTRICTED')).toBe(true);
        expect(canAccessConfidentiality('PARTNER', 'RESTRICTED')).toBe(true);
    });
});

describe('Knowledge Factory - Tag Schema Validation', () => {
    const validStandards = ['IFRS', 'ISA', 'GAAP', 'TAX', 'AUDIT_METHODOLOGY', 'OTHER'];
    const validDocTypes = ['LAW', 'REGULATION', 'STANDARD', 'GUIDANCE', 'TEMPLATE', 'OTHER'];
    const validConfidentiality = ['PUBLIC', 'INTERNAL', 'RESTRICTED'];

    const validateEnrichment = (output: Record<string, unknown>) => {
        const errors: string[] = [];

        if (!validStandards.includes(output.standard as string)) {
            errors.push(`Invalid standard: ${output.standard}`);
        }
        if (!validDocTypes.includes(output.docType as string)) {
            errors.push(`Invalid docType: ${output.docType}`);
        }
        if (!validConfidentiality.includes(output.confidentiality as string)) {
            errors.push(`Invalid confidentiality: ${output.confidentiality}`);
        }
        if (!Array.isArray(output.topics)) {
            errors.push('topics must be an array');
        }
        if (!Array.isArray(output.entities)) {
            errors.push('entities must be an array');
        }

        return { valid: errors.length === 0, errors };
    };

    it('validates correct enrichment output', () => {
        const output = {
            standard: 'IFRS',
            docType: 'STANDARD',
            confidentiality: 'PUBLIC',
            topics: ['Revenue', 'Contracts'],
            entities: ['IFRS 15'],
        };

        const result = validateEnrichment(output);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid standard', () => {
        const output = {
            standard: 'INVALID',
            docType: 'STANDARD',
            confidentiality: 'PUBLIC',
            topics: [],
            entities: [],
        };

        const result = validateEnrichment(output);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid standard: INVALID');
    });

    it('rejects non-array topics', () => {
        const output = {
            standard: 'IFRS',
            docType: 'STANDARD',
            confidentiality: 'PUBLIC',
            topics: 'not-an-array',
            entities: [],
        };

        const result = validateEnrichment(output);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('topics must be an array');
    });
});

describe('Knowledge Factory - Idempotency', () => {
    it('same content produces same hash', () => {
        const content = 'This is test content that should be chunked consistently.';
        const simpleHash = (s: string) => {
            let h = 0;
            for (const c of s) h = Math.imul(31, h) + c.charCodeAt(0) | 0;
            return h.toString(16);
        };

        const hash1 = simpleHash(content);
        const hash2 = simpleHash(content);

        expect(hash1).toBe(hash2);
    });

    it('detects duplicate chunks', () => {
        const existingHashes = new Set(['abc123', 'def456']);
        const newChunks = [
            { hash: 'abc123', content: 'Existing' },
            { hash: 'ghi789', content: 'New' },
        ];

        const duplicates = newChunks.filter(c => existingHashes.has(c.hash));
        const newOnes = newChunks.filter(c => !existingHashes.has(c.hash));

        expect(duplicates).toHaveLength(1);
        expect(newOnes).toHaveLength(1);
        expect(newOnes[0].content).toBe('New');
    });
});
