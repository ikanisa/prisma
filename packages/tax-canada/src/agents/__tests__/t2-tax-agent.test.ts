
import { describe, it, expect, beforeEach } from 'vitest';
import {
    createT2TaxAgent,
    T2TaxAgent
} from '../t2-tax-agent.js';
import type { FinancialStatements, CanadianEntityProfile } from '@prisma/accounting-canada';

describe('T2TaxAgent', () => {
    let agent: T2TaxAgent;

    beforeEach(() => {
        agent = createT2TaxAgent();
    });

    const mockProfile: CanadianEntityProfile = {
        entityId: 'corp-123',
        name: 'Test Corp',
        entityType: 'private_enterprise',
        incorporationProvince: 'ON',
        operatingProvinces: ['ON'],
        revenue: 400_000,
        totalAssets: 200_000,
        employees: 3,
        isPubliclyAccountable: false,
        hasPEInvestor: false,
        isCCPC: true, // Eligible for SBD
        fiscalYearEnd: new Date('2025-12-31'),
        requiresBilingualFS: false
    };

    describe('calculateFederalTax', () => {
        it('should apply Small Business Deduction for eligible CCPC', async () => {
            const result = await agent.calculateFederalTax(100_000, mockProfile as any);

            // Basic Federal Rate: 38%
            // Abatement: 10%
            // Net: 28%
            // SBD: 19% -> 9% (Small Business)

            // 100k is < 500k limit
            expect(result.effectiveRate).toBeCloseTo(0.09, 2);
            expect(result.part1).toBeCloseTo(9_000, 0);
        });

        it('should use General Rate for non-CCPC', async () => {
            const publicProfile = { ...mockProfile, isCCPC: false, entityType: 'public_company' as const };
            const result = await agent.calculateFederalTax(100_000, publicProfile as any);

            // 15% General Rate
            expect(result.effectiveRate).toBeCloseTo(0.15, 2);
            expect(result.part1).toBeCloseTo(15_000, 0);
        });
    });

    describe('calculateProvincialTax', () => {
        it('should calculate Ontario tax correctly', async () => {
            const result = await agent.calculateProvincialTax(100_000, { provinces: ['ON'], isCCPC: true } as any);

            // Returns ProvincialReturn[]
            const onReturn = result.find(p => p.province === 'ON');
            expect(onReturn).toBeDefined();

            // ON SBD rate is 3.2% of 100k = 3200
            expect(onReturn?.taxPayable).toBeCloseTo(3_200, 0);
        });

        it('should calculate Alberta tax correctly', async () => {
            const result = await agent.calculateProvincialTax(100_000, { provinces: ['AB'], isCCPC: true } as any);

            const abReturn = result.find(p => p.province === 'AB');
            expect(abReturn).toBeDefined();

            // AB SBD rate is 2.0% of 100k = 2000
            expect(abReturn?.taxPayable).toBeCloseTo(2_000, 0);
        });
    });
});
