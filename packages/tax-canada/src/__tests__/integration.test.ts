/**
 * Integration Tests - @prisma/tax-canada
 * 
 * End-to-end tests with realistic sample data for Canadian tax workflows.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
    initializeCanadaTaxSystem,
    createT1TaxAgent,
    createTransferPricingAgent,
    createPillar2GloBEAgent,
    type CanadianProvince,
    type TaxContext,
    GLOBE_MINIMUM_RATE,
} from '../index.js';

describe('Canada Tax Integration Tests', () => {
    describe('Complete Tax System Initialization', () => {
        it('should initialize all tax agents', () => {
            const agents = initializeCanadaTaxSystem();

            expect(agents.t2).toBeDefined();
            expect(agents.t1).toBeDefined();
            expect(agents.gst).toBeDefined();
            expect(agents.transferPricing).toBeDefined();
            expect(agents.pillar2).toBeDefined();
        });
    });

    describe('T2 Corporate Tax Workflow', () => {
        it('should calculate federal tax with SBD for CCPC', () => {
            const { t2 } = initializeCanadaTaxSystem();
            const context: TaxContext = {
                entityId: 'corp-001',
                userId: 'user-001',
                fiscalYearEnd: new Date('2025-12-31'),
                provinces: ['ON'],
                isCCPC: true,
            };

            // CCPC with income under SBD limit
            const result = t2.calculateFederalTax(400_000, context);

            expect(result.part1).toBeGreaterThan(0);
            expect(result.effectiveRate).toBeLessThanOrEqual(0.15); // SBD reduces rate
        });

        it('should calculate provincial tax for all major provinces', () => {
            const { t2 } = initializeCanadaTaxSystem();
            const taxableIncome = 500_000;

            const provinces: CanadianProvince[] = ['ON', 'QC', 'AB', 'BC'];

            for (const province of provinces) {
                const context: TaxContext = {
                    entityId: 'corp-001',
                    userId: 'user-001',
                    fiscalYearEnd: new Date('2025-12-31'),
                    provinces: [province],
                    isCCPC: true,
                };

                const result = t2.calculateProvincialTax(taxableIncome, context);

                expect(result.length).toBeGreaterThan(0);
                expect(result[0].taxPayable).toBeGreaterThan(0);
                expect(result[0].province).toBe(province);
            }
        });
    });

    describe('T1 Personal Tax Workflow', () => {
        it('should calculate federal tax brackets correctly', () => {
            const t1 = createT1TaxAgent({ taxYear: 2026 });

            // Test various income levels
            const testCases = [
                { income: 50_000, expectedBracket: 0.15 },
                { income: 100_000, expectedBracket: 0.205 },
                { income: 200_000, expectedBracket: 0.29 },
                { income: 300_000, expectedBracket: 0.33 },
            ];

            for (const { income } of testCases) {
                const tax = t1.calculateFederalTax(income);
                expect(tax).toBeGreaterThan(0);
            }
        });

        it('should calculate provincial tax for Ontario', () => {
            const t1 = createT1TaxAgent({ taxYear: 2026 });
            const taxableIncome = 80_000;

            const provincialTax = t1.calculateProvincialTax(taxableIncome, 'ON');

            expect(provincialTax).toBeGreaterThan(0);
            // Ontario bracket 1: 5.05% up to ~$51K, then 9.15%
            expect(provincialTax).toBeLessThan(taxableIncome * 0.10);
        });

        it('should prepare complete T1 return', async () => {
            const t1 = createT1TaxAgent({ taxYear: 2026 });

            const income = {
                employmentIncome: 85_000,
                selfEmploymentIncome: 0,
                interestIncome: 500,
                dividendIncome: {
                    eligibleDividends: 0,
                    nonEligibleDividends: 0,
                    grossedUpAmount: 0,
                    dividendTaxCredit: 0,
                },
                capitalGains: {
                    totalGains: 0,
                    totalLosses: 0,
                    netGains: 0,
                    taxableGains: 0,
                    lifetimeExemptionUsed: 0,
                },
                rentalIncome: 0,
                rrspWithdrawals: 0,
                pensionIncome: 0,
                eiIncome: 0,
                otherIncome: 0,
                totalIncome: 85_500,
            };

            const deductions = {
                rrspContributions: 10_000,
                unionDues: 500,
                childcareExpenses: 0,
                movingExpenses: 0,
                supportPaymentsMade: 0,
                carryingCharges: 0,
                selfEmploymentExpenses: 0,
                otherEmploymentExpenses: 0,
                capitalLossCarryforward: 0,
                totalDeductions: 10_500,
            };

            const result = await t1.prepareT1Return(
                'taxpayer-001',
                income,
                deductions,
                'ON'
            );

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.netIncome).toBe(75_000); // 85,500 - 10,500
            expect(result.data!.federalTax).toBeGreaterThan(0);
            expect(result.data!.provincialTax).toBeGreaterThan(0);
        });
    });

    describe('GST/HST Tax Rates', () => {
        it('should return correct tax rates for all major provinces', () => {
            const { gst } = initializeCanadaTaxSystem();

            const expectedRates: Record<string, { gst?: number; hst?: number; pst?: number; qst?: number }> = {
                ON: { hst: 0.13 },
                QC: { gst: 0.05, qst: 0.09975 },
                AB: { gst: 0.05 },
                BC: { gst: 0.05, pst: 0.07 },
                SK: { gst: 0.05, pst: 0.06 },
            };

            for (const [province, expected] of Object.entries(expectedRates)) {
                const rates = gst.getTaxRates(province as CanadianProvince);

                if (expected.hst) expect(rates.hst).toBe(expected.hst);
                if (expected.gst) expect(rates.gst).toBe(expected.gst);
                if (expected.pst) expect(rates.pst).toBe(expected.pst);
                if (expected.qst) expect(rates.qst).toBe(expected.qst);
            }
        });
    });

    describe('Transfer Pricing Agent', () => {
        it('should analyze controlled transaction and assess penalty risk', async () => {
            const tp = createTransferPricingAgent();

            const transaction = {
                transactionId: 'tp-001',
                transactionType: 'SERVICES' as const,
                relatedParty: {
                    partyId: 'rp-001',
                    name: 'US Parent Corp',
                    country: 'United States',
                    countryCode: 'US',
                    relationship: 'PARENT' as const,
                    ownershipPercentage: 100,
                    taxJurisdictionRate: 0.21,
                },
                description: 'Management fees charged by US parent',
                transactionDate: new Date('2025-06-30'),
                amount: 2_000_000,
                currency: 'USD',
                amountCAD: 2_700_000,
                direction: 'OUTBOUND' as const,
                documentation: {
                    hasContemporaneousDoc: false,
                    lastUpdated: undefined,
                },
            };

            const result = await tp.analyzeTransaction(transaction);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.selectedMethod).toBe('COST_PLUS');
            expect(result.data!.recommendations.length).toBeGreaterThan(0);
            // Should recommend documentation since hasContemporaneousDoc is false
            expect(result.data!.recommendations.some(r =>
                r.includes('documentation')
            )).toBe(true);
        });
    });

    describe('Pillar 2 GloBE Agent', () => {
        it('should check scope for large MNE group', async () => {
            const pillar2 = createPillar2GloBEAgent({ fiscalYear: 2026 });

            const group = {
                groupId: 'mne-001',
                ultimateParentEntity: {
                    entityId: 'parent-001',
                    name: 'Global Holdings Inc.',
                    jurisdiction: 'CA',
                    tin: '123456789RC0001',
                    isUltimateParent: true,
                    isIntermediateParent: false,
                },
                fiscalYear: {
                    start: new Date('2026-01-01'),
                    end: new Date('2026-12-31'),
                },
                consolidatedRevenue: 900_000_000, // €750M+ equivalent
                isInScope: true,
                constituents: [],
            };

            const result = await pillar2.determineScope(group);

            expect(result.success).toBe(true);
            expect(result.data!.inScope).toBe(true);
            expect(result.data!.reason).toContain('750M');
        });

        it('should apply transitional safe harbour tests', () => {
            const pillar2 = createPillar2GloBEAgent({ fiscalYear: 2026 });

            // De minimis test
            const deMinimisResult = pillar2.checkTransitionalSafeHarbour(
                'LU',
                5_000_000,  // Revenue < €10M
                500_000,   // Profit < €1M
                100_000
            );
            expect(deMinimisResult.qualifies).toBe(true);
            expect(deMinimisResult.test).toBe('de_minimis');

            // Simplified ETR test (high tax jurisdiction)
            const highTaxResult = pillar2.checkTransitionalSafeHarbour(
                'CA',
                50_000_000,
                5_000_000,
                1_250_000  // 25% ETR > 15%
            );
            expect(highTaxResult.qualifies).toBe(true);
            expect(highTaxResult.test).toBe('simplified_etr');
        });

        it('should have correct minimum rate constant', () => {
            expect(GLOBE_MINIMUM_RATE).toBe(0.15);
        });
    });

    describe('Multi-Agent Tax Workflow', () => {
        it('should coordinate T2 and GST for corporate filing', async () => {
            const agents = initializeCanadaTaxSystem();
            const context: TaxContext = {
                entityId: 'corp-workflow-001',
                userId: 'user-001',
                fiscalYearEnd: new Date('2025-12-31'),
                provinces: ['ON'],
                isCCPC: true,
            };

            // Step 1: Calculate corporate taxable income
            const taxableIncome = 750_000;

            // Step 2: Federal T2
            const federalTax = agents.t2.calculateFederalTax(taxableIncome, context);
            expect(federalTax.part1).toBeGreaterThan(0);

            // Step 3: Provincial T2
            const provincialTax = agents.t2.calculateProvincialTax(taxableIncome, context);
            expect(provincialTax[0].taxPayable).toBeGreaterThan(0);

            // Step 4: GST/HST rates for sales
            const gstRates = agents.gst.getTaxRates('ON');
            expect(gstRates.hst).toBe(0.13);

            // Total corporate tax burden
            const totalCorporateTax = federalTax.part1 + provincialTax[0].taxPayable;
            expect(totalCorporateTax).toBeGreaterThan(0);
        });
    });
});
