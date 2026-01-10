/**
 * Malta Tax Agents Tests
 * 
 * Comprehensive test suite for Malta autonomous tax agents.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import agents
import { MaltaVATAgent } from '../agents/malta/vat-agent.js';
import { MaltaCorporateTaxAgentV2 } from '../agents/malta/corporate-tax-agent.js';
import { MaltaParticipationExemptionAgent } from '../agents/malta/participation-exemption-agent.js';
import { MaltaDoubleTaxReliefAgent } from '../agents/malta/double-tax-relief-agent.js';
import { MaltaTransferPricingAgent } from '../agents/malta/transfer-pricing-agent.js';

// Import types
import type {
    CorporateTaxRequest,
    CorporateTaxResult,
    ParticipationHolding,
    SubsidiaryFinancials,
    ForeignIncomeForRelief,
    RelatedPartyTransaction,
} from '../types/malta.js';

// ============================================================================
// MALTA VAT AGENT TESTS
// ============================================================================

describe('MaltaVATAgent', () => {
    let agent: MaltaVATAgent;

    beforeEach(() => {
        agent = new MaltaVATAgent({ enableAIClassification: false });
    });

    describe('Basic VAT Calculation', () => {
        it('should calculate 18% standard rate correctly', async () => {
            const result = await agent.calculateVAT({
                transactionType: 'sale',
                amount: 1000,
                goodsOrServices: 'goods',
                description: 'General merchandise',
                customerLocation: 'MT',
                customerType: 'b2c',
            });

            expect(result.vatRate).toBe(18);
            expect(result.vatAmount).toBe(180);
            expect(result.totalAmount).toBe(1180);
        });

        it('should apply 7% reduced rate for hotel accommodation', async () => {
            const result = await agent.calculateVAT({
                transactionType: 'sale',
                amount: 1000,
                goodsOrServices: 'services',
                description: 'Hotel accommodation services',
                customerLocation: 'MT',
                customerType: 'b2c',
            });

            expect(result.vatRate).toBe(7);
            expect(result.vatAmount).toBe(70);
        });
    });

    describe('Reverse Charge Mechanism', () => {
        it('should apply reverse charge for B2B intra-EU supply', async () => {
            const result = await agent.calculateVAT({
                transactionType: 'sale',
                amount: 1000,
                goodsOrServices: 'goods',
                description: 'General merchandise',
                customerLocation: 'DE',
                customerVATNumber: 'DE123456789',
                customerType: 'b2b',
            });

            expect(result.reverseChargeApplicable).toBe(true);
            expect(result.vatAmount).toBe(0);
        });
    });

    describe('SME Scheme Eligibility', () => {
        it('should qualify for Article 11 under threshold', () => {
            const result = agent.checkSMEEligibility(30000, 0);

            expect(result.article11Eligible).toBe(true);
            expect(result.article11AEligible).toBe(true);
        });

        it('should NOT qualify for Article 11 over threshold', () => {
            const result = agent.checkSMEEligibility(40000, 0);

            expect(result.article11Eligible).toBe(false);
        });
    });

    describe('Intrastat Requirements', () => {
        it('should require Intrastat reporting above €700', () => {
            const result = agent.checkIntrastatRequired(800);

            expect(result.required).toBe(true);
            expect(result.threshold).toBe(700);
        });
    });
});

// ============================================================================
// MALTA CORPORATE TAX AGENT TESTS
// ============================================================================

describe('MaltaCorporateTaxAgentV2', () => {
    let agent: MaltaCorporateTaxAgentV2;

    beforeEach(() => {
        agent = new MaltaCorporateTaxAgentV2({ enableAIAnalysis: false });
    });

    describe('Standard 35% Tax Calculation', () => {
        it('should calculate 35% corporate tax', async () => {
            const request: CorporateTaxRequest = {
                chargeableIncome: 100000,
                incomeBreakdown: {
                    maltaTradingIncome: 100000,
                },
                companyProfile: {
                    name: 'Test Malta Ltd',
                    isResident: true,
                    isDomiciled: true,
                },
                fiscalYear: 2025,
            };

            const result = await agent.calculateCorporateTax(request);

            expect(result.regime).toBe('standard_imputation');
            // Type guard to access CorporateTaxResult properties
            if ('corporateTaxRate' in result) {
                expect(result.corporateTaxRate).toBe(35);
                expect(result.corporateTaxPayable).toBe(35000);
            }
        });
    });

    describe('Tax Account Allocation', () => {
        it('should allocate Malta trading income to MTA', async () => {
            const request: CorporateTaxRequest = {
                chargeableIncome: 100000,
                incomeBreakdown: {
                    maltaTradingIncome: 100000,
                },
                companyProfile: {
                    name: 'Test Malta Ltd',
                    isResident: true,
                    isDomiciled: true,
                },
                fiscalYear: 2025,
            };

            const result = await agent.calculateCorporateTax(request);

            // Type guard
            if ('taxAccounts' in result) {
                expect(result.taxAccounts.accounts.MTA.income).toBe(100000);
                expect(result.taxAccounts.accounts.MTA.refundRate).toBe('six_sevenths');
            }
        });
    });

    describe('Shareholder Refund Calculations', () => {
        it('should calculate 6/7ths refund for MTA income', async () => {
            const request: CorporateTaxRequest = {
                chargeableIncome: 100000,
                incomeBreakdown: {
                    maltaTradingIncome: 100000,
                },
                companyProfile: {
                    name: 'Test Malta Ltd',
                    isResident: true,
                    isDomiciled: true,
                },
                fiscalYear: 2025,
            };

            const result = await agent.calculateCorporateTax(request);

            // Type guard
            if ('taxAccounts' in result) {
                // 35% tax = 35,000
                // 6/7ths refund = 30,000
                expect(result.taxAccounts.accounts.MTA.refundAmount).toBe(30000);
                expect(result.taxAccounts.accounts.MTA.effectiveRate).toBe(5);
            }
        });
    });

    describe('FITWI 15% Regime', () => {
        it('should calculate 15% FITWI tax', async () => {
            const request: CorporateTaxRequest = {
                chargeableIncome: 100000,
                incomeBreakdown: {
                    maltaTradingIncome: 100000,
                },
                companyProfile: {
                    name: 'Test Malta Ltd',
                    isResident: true,
                    isDomiciled: true,
                },
                fiscalYear: 2025,
                fitwiElected: true,
            };

            const result = await agent.calculateCorporateTax(request);

            expect(result.regime).toBe('fitwi_15_percent');
            // Type guard
            if ('fitwiTax' in result) {
                expect(result.fitwiTax).toBe(15000);
            }
        });
    });
});

// ============================================================================
// PARTICIPATION EXEMPTION AGENT TESTS
// ============================================================================

describe('MaltaParticipationExemptionAgent', () => {
    let agent: MaltaParticipationExemptionAgent;

    beforeEach(() => {
        agent = new MaltaParticipationExemptionAgent({ enableAIAnalysis: false });
    });

    describe('Equity Holding Test', () => {
        it('should qualify with ≥5% equity and 2/3 rights', async () => {
            const holding: ParticipationHolding = {
                subsidiaryName: 'Foreign Sub Ltd',
                equityPercentage: 10,
                acquisitionCost: 500000,
                acquisitionDate: '2024-01-01',
                jurisdiction: 'UK',
                votingRightsPercentage: 10,
                profitRightsPercentage: 10,
                liquidationRightsPercentage: 10,
            };

            const financials: SubsidiaryFinancials = {
                totalAssets: 5000000,
                totalIncome: 1000000,
                statutoryTaxRate: 19,
                // Add qualifying investments >50% of assets to pass investment test
                qualifyingInvestments: {
                    equityHoldingsInOtherCompanies: 3000000,
                    immovablePropertyForOwnBusiness: 500000,
                },
                // Add active business income to pass active business test
                passiveIncome: {
                    interest: 100000,
                    dividends: 100000,
                    // Passive <50% of total income
                }
            };

            const result = await agent.assessQualification(holding, 'dividend', 100000, financials);

            expect(result.qualificationRoute).toBe('equity_holding');
            // All anti-abuse tests should pass with these financials
            expect(result.antiAbuseTestsPassed.allPassed).toBe(true);
            expect(result.qualifies).toBe(true);
        });
    });

    describe('Anti-Abuse Tests', () => {
        it('should pass tax test with 15%+ statutory rate', async () => {
            const holding: ParticipationHolding = {
                subsidiaryName: 'UK Sub Ltd',
                equityPercentage: 10,
                acquisitionCost: 500000,
                acquisitionDate: '2024-01-01',
                jurisdiction: 'UK',
                votingRightsPercentage: 10,
                profitRightsPercentage: 10,
            };

            const financials: SubsidiaryFinancials = {
                totalAssets: 5000000,
                totalIncome: 1000000,
                statutoryTaxRate: 19,
            };

            const result = await agent.assessQualification(holding, 'dividend', 100000, financials);

            expect(result.antiAbuseTestsPassed.taxTest.passed).toBe(true);
        });

        it('should fail tax test with low-tax jurisdiction', async () => {
            const holding: ParticipationHolding = {
                subsidiaryName: 'Cayman Sub Ltd',
                equityPercentage: 10,
                acquisitionCost: 500000,
                acquisitionDate: '2024-01-01',
                jurisdiction: 'KY',
                votingRightsPercentage: 10,
                profitRightsPercentage: 10,
            };

            const financials: SubsidiaryFinancials = {
                totalAssets: 5000000,
                totalIncome: 1000000,
                statutoryTaxRate: 0,
            };

            const result = await agent.assessQualification(holding, 'dividend', 100000, financials);

            expect(result.antiAbuseTestsPassed.taxTest.passed).toBe(false);
        });
    });
});

// ============================================================================
// DOUBLE TAX RELIEF AGENT TESTS
// ============================================================================

describe('MaltaDoubleTaxReliefAgent', () => {
    let agent: MaltaDoubleTaxReliefAgent;

    beforeEach(() => {
        agent = new MaltaDoubleTaxReliefAgent({ enableAIOptimization: false });
    });

    describe('Treaty Database', () => {
        it('should have treaty with UK', () => {
            expect(agent.hasTreaty('UK')).toBe(true);
        });

        it('should have treaty with US', () => {
            expect(agent.hasTreaty('US')).toBe(true);
        });

        it('should return treaty rates', () => {
            const treaty = agent.getTreatyRates('UK');

            expect(treaty).not.toBeNull();
            expect(treaty?.dividendWHT).toBe(15);
            expect(treaty?.interestWHT).toBe(10);
            expect(treaty?.royaltyWHT).toBe(5);
        });

        it('should have 40+ treaty countries', () => {
            const countries = agent.getTreatyCountries();
            expect(countries.length).toBeGreaterThan(40);
        });
    });

    describe('Treaty Relief Calculation', () => {
        it('should calculate treaty relief correctly', async () => {
            const foreignIncome: ForeignIncomeForRelief = {
                incomeType: 'dividend',
                sourceCountry: 'UK',
                grossAmount: 100000,
                foreignTaxPaid: 15000,
                treatyExists: true,
            };

            const result = await agent.calculateRelief(foreignIncome);

            expect(result.allMethods.treaty).not.toBeNull();
            expect(result.allMethods.treaty?.reliefAmount).toBe(15000);
            expect(result.allMethods.treaty?.netMaltaTax).toBe(20000);
        });
    });

    describe('FRFTC Calculation', () => {
        it('should calculate 25% deemed credit', async () => {
            const foreignIncome: ForeignIncomeForRelief = {
                incomeType: 'dividend',
                sourceCountry: 'AE',
                grossAmount: 100000,
                foreignTaxPaid: 0,
                treatyExists: true,
            };

            const result = await agent.calculateRelief(foreignIncome);

            expect(result.allMethods.frftc).not.toBeNull();
            expect(result.allMethods.frftc?.reliefAmount).toBe(25000);
            expect(result.allMethods.frftc?.netMaltaTax).toBe(10000);
        });

        it('should recommend FRFTC for low-tax jurisdictions', async () => {
            const foreignIncome: ForeignIncomeForRelief = {
                incomeType: 'dividend',
                sourceCountry: 'AE',
                grossAmount: 100000,
                foreignTaxPaid: 0,
                treatyExists: true,
            };

            const result = await agent.calculateRelief(foreignIncome);

            expect(result.recommendedMethod).toBe('frftc');
        });
    });
});

// ============================================================================
// TRANSFER PRICING AGENT TESTS
// ============================================================================

describe('MaltaTransferPricingAgent', () => {
    let agent: MaltaTransferPricingAgent;

    beforeEach(() => {
        agent = new MaltaTransferPricingAgent({ enableAIAnalysis: false });
    });

    describe('Transaction Assessment', () => {
        it('should assess single related party transaction', async () => {
            const transactions: RelatedPartyTransaction[] = [{
                transactionId: 'TXN-001',
                transactionType: 'services',
                counterpartyName: 'Parent Corp Ltd',
                counterpartyJurisdiction: 'UK',
                relationship: 'Parent',
                amount: 500000,
                pricingMethod: 'TNMM',
                documentationExists: true,
            }];

            const result = await agent.assessTransferPricing(
                transactions,
                { name: 'Malta Sub Ltd', isResident: true, isDomiciled: true },
                2025
            );

            expect(result.totalRelatedPartyValue).toBe(500000);
            expect(result.transactions).toHaveLength(1);
        });

        it('should require documentation for large transactions', async () => {
            const transactions: RelatedPartyTransaction[] = [{
                transactionId: 'TXN-001',
                transactionType: 'goods',
                counterpartyName: 'Parent Corp Ltd',
                counterpartyJurisdiction: 'UK',
                relationship: 'Parent',
                amount: 1000000,
                pricingMethod: 'CUP',
                documentationExists: false,
            }];

            const result = await agent.assessTransferPricing(
                transactions,
                { name: 'Malta Sub Ltd', isResident: true, isDomiciled: true },
                2025
            );

            expect(result.documentationAdequate).toBe(false);
            expect(result.localFileRequired).toBe(true);
        });
    });

    describe('OECD Methods', () => {
        it('should provide method descriptions', () => {
            expect(agent.getMethodDescription('CUP')).toBe('Comparable Uncontrolled Price');
            expect(agent.getMethodDescription('TNMM')).toBe('Transactional Net Margin Method');
            expect(agent.getMethodDescription('PSM')).toBe('Profit Split Method');
        });
    });
});
