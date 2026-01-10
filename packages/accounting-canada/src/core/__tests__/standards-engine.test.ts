
import { describe, it, expect, beforeEach } from 'vitest';
import {
    AccountingStandardsEngine,
    createStandardsEngine
} from '../standards-engine.js';
import type { CanadianEntityProfile } from '../../types/index.js';

describe('AccountingStandardsEngine', () => {
    let engine: AccountingStandardsEngine;

    beforeEach(() => {
        engine = createStandardsEngine();
    });

    const baseProfile: CanadianEntityProfile = {
        entityId: 'test-entity',
        name: 'Test Corp',
        entityType: 'private_enterprise',
        incorporationProvince: 'ON',
        operatingProvinces: ['ON'],
        revenue: 1_000_000,
        totalAssets: 500_000,
        employees: 10,
        isPubliclyAccountable: false,
        hasPEInvestor: false,
        isCCPC: true,
        fiscalYearEnd: new Date('2025-12-31'),
        requiresBilingualFS: false
    };

    describe('selectFramework', () => {
        it('should select IFRS for publicly accountable entities', () => {
            const profile: CanadianEntityProfile = {
                ...baseProfile,
                entityType: 'public_company',
                isPubliclyAccountable: true,
                revenue: 50_000_000
            };

            const result = engine.selectFramework(profile);

            expect(result.framework).toBe('IFRS');
            expect(result.reason).toContain('public accountability');
            expect(result.alternativeAllowed).toBe(false);
        });

        it('should select ASPE for standard private enterprises', () => {
            const profile: CanadianEntityProfile = {
                ...baseProfile,
                revenue: 5_000_000
            };

            const result = engine.selectFramework(profile);

            expect(result.framework).toBe('ASPE');
            expect(result.reason).toContain('Private enterprise');
            expect(result.alternativeAllowed).toBe(true);
        });

        it('should recommend IFRS for PE-backed private enterprises >$20M', () => {
            const profile: CanadianEntityProfile = {
                ...baseProfile,
                revenue: 25_000_000,
                hasPEInvestor: true
            };

            const result = engine.selectFramework(profile);

            expect(result.framework).toBe('IFRS');
            expect(result.reason).toContain('Private enterprise with PE investor');
        });

        it('should select ASNFPO for non-profit organizations', () => {
            const profile: CanadianEntityProfile = {
                ...baseProfile,
                entityType: 'not_for_profit'
            };

            const result = engine.selectFramework(profile);

            expect(result.framework).toBe('ASNFPO');
        });

        it('should identify Quebec bilingual requirement', () => {
            const profile: CanadianEntityProfile = {
                ...baseProfile,
                incorporationProvince: 'QC',
                requiresBilingualFS: true // Explicitly set or derived? In types it's a property.
            };

            const result = engine.selectFramework(profile);

            expect(result.bilingualRequired).toBe(true);
        });

        it('should identify Quebec bilingual requirement via operating province', () => {
            const profile: CanadianEntityProfile = {
                ...baseProfile,
                incorporationProvince: 'ON',
                operatingProvinces: ['ON', 'QC'],
                requiresBilingualFS: true
            };

            const result = engine.selectFramework(profile);

            expect(result.bilingualRequired).toBe(true);
        });
    });
});
