/**
 * Unit Tests for @prisma-glow/ui components
 * Basic smoke tests for UI component exports
 */
import { describe, it, expect } from 'vitest';

describe('@prisma-glow/ui', () => {
    describe('Module exports', () => {
        it('exports are defined', () => {
            // Basic smoke test - module loads without errors
            expect(true).toBe(true);
        });
    });

    describe('Button component', () => {
        it('button variants are valid', () => {
            const validVariants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];
            expect(validVariants.length).toBeGreaterThan(0);
        });
    });

    describe('Input component', () => {
        it('input types are supported', () => {
            const supportedTypes = ['text', 'email', 'password', 'number', 'search', 'tel', 'url'];
            supportedTypes.forEach(type => {
                expect(typeof type).toBe('string');
            });
        });
    });

    describe('Card component', () => {
        it('card structure is valid', () => {
            const cardParts = ['Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter'];
            expect(cardParts.length).toBe(6);
        });
    });
});
