/**
 * Rwanda Accounting Agents - Test Suite
 * 
 * Comprehensive tests for all Rwanda accounting agents.
 * Uses Vitest for testing.
 * 
 * @package @prisma/accounting-rwanda
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import agents
import {
    RSSBAgent,
    createRSSBAgent,
} from '../src/agents/compliance/rssb-agent.js';

import {
    VATComplianceAgent,
    createVATComplianceAgent,
} from '../src/agents/compliance/vat-compliance-agent.js';

import {
    CITAgent,
    createCITAgent,
    type CITFinancialData,
    type EntityTaxProfile,
} from '../src/agents/tax/cit-agent.js';

import {
    JournalEntryAgent,
    createJournalEntryAgent,
} from '../src/agents/processing/journal-entry-agent.js';

import {
    AuditRiskAgent,
    createAuditRiskAgent,
} from '../src/agents/audit/risk-assessment-agent.js';

import {
    AnomalyDetectionAgent,
    createAnomalyDetectionAgent,
} from '../src/agents/audit/anomaly-detection-agent.js';

// Import types
import type {
    AgentContext,
    TransactionInput,
} from '../src/index.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockContext: AgentContext = {
    companyId: 'comp-001',
    companyName: 'Test Company Ltd',
    tin: '123456789',
    classification: 'PIE',
    framework: 'FULL_IFRS',
    auditTier: 'TIER_I',
    fiscalYearEnd: new Date('2025-12-31'),
    reportingCurrency: 'RWF',
    isVATRegistered: true,
    currentDate: new Date('2026-01-10'),
};

// ============================================================================
// RSSB AGENT TESTS
// ============================================================================

describe('RSSBAgent', () => {
    let agent: RSSBAgent;

    beforeEach(() => {
        agent = createRSSBAgent();
    });

    describe('constructor', () => {
        it('should create singleton instance', () => {
            const agent1 = createRSSBAgent();
            const agent2 = createRSSBAgent();
            expect(agent1).toBe(agent2);
        });

        it('should have correct agent properties', () => {
            expect(agent.agentId).toBe('rwanda-rssb-agent');
            expect(agent.agentType).toBe('COMPLIANCE_MONITORING');
            expect(agent.autonomyLevel).toBe(4);
        });
    });

    describe('calculateContribution', () => {
        it('should calculate correct RSSB contributions for basic salary', () => {
            const result = agent.calculateContribution({
                employeeId: 'emp-001',
                employeeName: 'John Doe',
                grossSalary: 500000,
            });

            // Pension: 6% employer + 6% employee = 12% of 500,000
            expect(result.pensionEmployer).toBe(30000);
            expect(result.pensionEmployee).toBe(30000);

            // Occupational hazard: 2%
            expect(result.occupationalHazard).toBe(10000);

            // Maternity benefit: 0.3%
            expect(result.maternityBenefit).toBe(1500);

            // Totals
            expect(result.totalEmployer).toBe(41500); // 30000 + 10000 + 1500
            expect(result.totalEmployee).toBe(30000);
        });

        it('should include allowances in calculation', () => {
            const result = agent.calculateContribution({
                employeeId: 'emp-001',
                employeeName: 'Jane Doe',
                grossSalary: 400000,
                allowances: 100000,
            });

            // Base: 500,000 (400,000 + 100,000)
            expect(result.pensionEmployer).toBe(30000);
            expect(result.pensionEmployee).toBe(30000);
        });

        it('should handle zero salary', () => {
            const result = agent.calculateContribution({
                employeeId: 'emp-001',
                employeeName: 'Zero Salary',
                grossSalary: 0,
            });

            expect(result.pensionEmployer).toBe(0);
            expect(result.pensionEmployee).toBe(0);
            expect(result.occupationalHazard).toBe(0);
            expect(result.maternityBenefit).toBe(0);
        });
    });

    describe('calculatePAYE', () => {
        it('should return 0% tax for income under RWF 30,000/month', () => {
            const result = agent.calculatePAYE(25000);
            expect(result.payeTax).toBe(0);
            expect(result.bracket.rate).toBe(0);
        });

        it('should apply 20% tax for income RWF 30,001-100,000/month', () => {
            const result = agent.calculatePAYE(60000);
            // Annual: 720,000
            // Tax: (720,000 - 360,000) * 0.20 = 72,000
            // Monthly: 6,000
            expect(result.payeTax).toBe(6000);
        });

        it('should apply 30% tax for income above RWF 100,000/month', () => {
            const result = agent.calculatePAYE(150000);
            // Annual: 1,800,000
            // First 360,000: 0
            // Next 840,000: 20% = 168,000
            // Above 1,200,000 (600,000): 30% = 180,000
            // Total: 348,000 annual = 29,000/month
            expect(result.payeTax).toBe(29000);
        });
    });

    describe('calculateDueDate', () => {
        it('should set due date to 15th of following month', () => {
            const period = new Date('2026-01-01');
            const dueDate = agent.calculateDueDate(period);

            expect(dueDate.getMonth()).toBe(1); // February
            expect(dueDate.getDate()).toBe(15);
        });
    });

    describe('getProjectedRates', () => {
        it('should return 12% for 2026', () => {
            const rates = agent.getProjectedRates(2026);
            expect(rates.pensionEmployer + rates.pensionEmployee).toBe(12);
        });

        it('should return 20% for 2030', () => {
            const rates = agent.getProjectedRates(2030);
            expect(rates.pensionEmployer + rates.pensionEmployee).toBe(20);
        });
    });
});

// ============================================================================
// VAT COMPLIANCE AGENT TESTS
// ============================================================================

describe('VATComplianceAgent', () => {
    let agent: VATComplianceAgent;

    beforeEach(() => {
        agent = createVATComplianceAgent();
    });

    describe('constructor', () => {
        it('should create singleton instance', () => {
            const agent1 = createVATComplianceAgent();
            const agent2 = createVATComplianceAgent();
            expect(agent1).toBe(agent2);
        });
    });

    describe('categorizeTransaction', () => {
        it('should categorize export as zero-rated', () => {
            const category = agent.categorizeTransaction({
                id: 'tx-001',
                date: new Date(),
                description: 'Export sale',
                amount: 100000,
                type: 'INCOME',
                isExport: true,
            });

            expect(category).toBe('ZERO_RATED');
        });

        it('should categorize medical services as exempt', () => {
            const category = agent.categorizeTransaction({
                id: 'tx-002',
                date: new Date(),
                description: 'Medical consultation fee',
                amount: 50000,
                type: 'INCOME',
            });

            expect(category).toBe('EXEMPT');
        });

        it('should categorize normal sale as standard', () => {
            const category = agent.categorizeTransaction({
                id: 'tx-003',
                date: new Date(),
                description: 'Software license sale',
                amount: 200000,
                type: 'INCOME',
            });

            expect(category).toBe('STANDARD');
        });
    });

    describe('calculateVAT', () => {
        it('should calculate 18% VAT for standard-rated', () => {
            const result = agent.calculateVAT(100000, 'STANDARD');
            expect(result.vatAmount).toBe(18000);
            expect(result.vatRate).toBe(18);
            expect(result.grossAmount).toBe(118000);
        });

        it('should return 0 VAT for zero-rated', () => {
            const result = agent.calculateVAT(100000, 'ZERO_RATED');
            expect(result.vatAmount).toBe(0);
            expect(result.vatRate).toBe(0);
        });

        it('should return 0 VAT for exempt', () => {
            const result = agent.calculateVAT(100000, 'EXEMPT');
            expect(result.vatAmount).toBe(0);
        });
    });

    describe('checkVATRegistrationRequired', () => {
        it('should require registration if turnover exceeds RWF 20M', () => {
            const result = agent.checkVATRegistrationRequired(25000000);
            expect(result.required).toBe(true);
        });

        it('should not require registration below threshold', () => {
            const result = agent.checkVATRegistrationRequired(15000000);
            expect(result.required).toBe(false);
        });

        it('should require if quarterly exceeds RWF 5M', () => {
            const result = agent.checkVATRegistrationRequired(10000000, 6000000);
            expect(result.required).toBe(true);
        });
    });
});

// ============================================================================
// CIT AGENT TESTS
// ============================================================================

describe('CITAgent', () => {
    let agent: CITAgent;

    beforeEach(() => {
        agent = createCITAgent();
    });

    describe('determineCITRate', () => {
        it('should return 28% for standard company', () => {
            const rate = agent.determineCITRate({
                isListedCompany: false,
                isHoldingCompany: false,
                isIPCompany: false,
                isMicrofinanceCooperative: false,
                annualTurnover: 100000000,
            });
            expect(rate).toBe(0.28);
        });

        it('should return 20% for listed company with 40%+ public shareholding', () => {
            const rate = agent.determineCITRate({
                isListedCompany: true,
                yearsListedOnRSE: 2,
                publicShareholdingPercent: 45,
                isHoldingCompany: false,
                isIPCompany: false,
                isMicrofinanceCooperative: false,
                annualTurnover: 500000000,
            });
            expect(rate).toBe(0.20);
        });

        it('should return 25% for listed company with 30%+ public shareholding', () => {
            const rate = agent.determineCITRate({
                isListedCompany: true,
                yearsListedOnRSE: 3,
                publicShareholdingPercent: 35,
                isHoldingCompany: false,
                isIPCompany: false,
                isMicrofinanceCooperative: false,
                annualTurnover: 500000000,
            });
            expect(rate).toBe(0.25);
        });

        it('should return 3% for holding company', () => {
            const rate = agent.determineCITRate({
                isListedCompany: false,
                isHoldingCompany: true,
                isIPCompany: false,
                isMicrofinanceCooperative: false,
                annualTurnover: 500000000,
            });
            expect(rate).toBe(0.03);
        });

        it('should return 0% for microfinance cooperative under 5 years', () => {
            const rate = agent.determineCITRate({
                isListedCompany: false,
                isHoldingCompany: false,
                isIPCompany: false,
                isMicrofinanceCooperative: true,
                yearsInOperation: 3,
                annualTurnover: 50000000,
            });
            expect(rate).toBe(0);
        });
    });

    describe('calculateTaxAdjustments', () => {
        it('should add back depreciation', () => {
            const financials: CITFinancialData = {
                profitBeforeTax: 10000000,
                revenue: 100000000,
                totalAssets: 50000000,
                depreciation: 5000000,
                entertainmentExpenses: 200000,
                donations: 0,
                approvedDonations: 0,
                finesAndPenalties: 0,
                rdExpenses: 0,
                capitalExpenditure: { buildings: 0, machinery: 0, vehicles: 0, computers: 0, furniture: 0 },
                priorYearLosses: 0,
                provisionalPayments: 0,
            };

            const adjustments = agent.calculateTaxAdjustments(financials);

            const depreciationAddBack = adjustments.addBacks.find(a => a.item === 'Book depreciation');
            expect(depreciationAddBack).toBeDefined();
            expect(depreciationAddBack?.amount).toBe(5000000);
        });

        it('should add back excess entertainment', () => {
            const financials: CITFinancialData = {
                profitBeforeTax: 10000000,
                revenue: 100000000,
                totalAssets: 50000000,
                depreciation: 0,
                entertainmentExpenses: 1000000, // 1% of revenue, exceeds 0.5%
                donations: 0,
                approvedDonations: 0,
                finesAndPenalties: 0,
                rdExpenses: 0,
                capitalExpenditure: { buildings: 0, machinery: 0, vehicles: 0, computers: 0, furniture: 0 },
                priorYearLosses: 0,
                provisionalPayments: 0,
            };

            const adjustments = agent.calculateTaxAdjustments(financials);

            const excessEntertainment = adjustments.addBacks.find(a => a.item.includes('entertainment'));
            expect(excessEntertainment).toBeDefined();
            // Allowed: 0.5% of 100M = 500,000. Excess: 1,000,000 - 500,000 = 500,000
            expect(excessEntertainment?.amount).toBe(500000);
        });

        it('should provide R&D deduction at 150%', () => {
            const financials: CITFinancialData = {
                profitBeforeTax: 10000000,
                revenue: 100000000,
                totalAssets: 50000000,
                depreciation: 0,
                entertainmentExpenses: 0,
                donations: 0,
                approvedDonations: 0,
                finesAndPenalties: 0,
                rdExpenses: 2000000, // R&D expenses
                capitalExpenditure: { buildings: 0, machinery: 0, vehicles: 0, computers: 0, furniture: 0 },
                priorYearLosses: 0,
                provisionalPayments: 0,
            };

            const adjustments = agent.calculateTaxAdjustments(financials);

            const rdDeduction = adjustments.deductions.find(d => d.item.includes('R&D'));
            expect(rdDeduction).toBeDefined();
            // Extra 50% = 1,000,000
            expect(rdDeduction?.amount).toBe(1000000);
        });
    });

    describe('calculateProvisionalCIT', () => {
        it('should calculate 25% for Q1', () => {
            const result = agent.calculateProvisionalCIT(
                1,
                100000000,
                { isListedCompany: false, isHoldingCompany: false, isIPCompany: false, isMicrofinanceCooperative: false, annualTurnover: 500000000 },
                0
            );

            // 28% of 100M = 28M. Q1 = 25% = 7M
            expect(result.estimatedAnnualCIT).toBe(28000000);
            expect(result.quarterlyAmount).toBe(7000000);
            expect(result.amountDue).toBe(7000000);
        });

        it('should calculate cumulative for Q2', () => {
            const result = agent.calculateProvisionalCIT(
                2,
                100000000,
                { isListedCompany: false, isHoldingCompany: false, isIPCompany: false, isMicrofinanceCooperative: false, annualTurnover: 500000000 },
                7000000 // Q1 already paid
            );

            // By Q2, should have paid 50% = 14M. Already paid 7M, so 7M due
            expect(result.cumulativeRequired).toBe(14000000);
            expect(result.amountDue).toBe(7000000);
        });
    });
});

// ============================================================================
// JOURNAL ENTRY AGENT TESTS
// ============================================================================

describe('JournalEntryAgent', () => {
    let agent: JournalEntryAgent;

    beforeEach(() => {
        agent = createJournalEntryAgent();
    });

    describe('determineVATCategory', () => {
        it('should identify export as zero-rated', () => {
            const category = agent.determineVATCategory({
                id: 'tx-001',
                date: new Date(),
                description: 'Export sale to Kenya',
                amount: 100000,
                type: 'INCOME',
                isExport: true,
            });
            expect(category).toBe('ZERO_RATED');
        });

        it('should identify EAC supply as zero-rated', () => {
            const category = agent.determineVATCategory({
                id: 'tx-002',
                date: new Date(),
                description: 'Sale to Tanzania',
                amount: 100000,
                type: 'INCOME',
                isEACSupply: true,
            });
            expect(category).toBe('ZERO_RATED');
        });
    });

    describe('validateDoubleEntry', () => {
        it('should return true for balanced entry', () => {
            const entry = {
                id: 'je-001',
                date: new Date(),
                description: 'Test entry',
                entries: [
                    { accountCode: '1121', accountName: 'Receivable', debit: 100000, description: 'Dr' },
                    { accountCode: '4110', accountName: 'Revenue', credit: 100000, description: 'Cr' },
                ],
                ifrsStandard: 'IFRS_15' as const,
                recognitionDate: new Date(),
                measurementBasis: 'FAIR_VALUE' as const,
                aiCategorized: true,
                aiConfidence: 0.95,
                requiresReview: false,
            };

            expect(agent.validateDoubleEntry(entry)).toBe(true);
        });

        it('should return false for unbalanced entry', () => {
            const entry = {
                id: 'je-002',
                date: new Date(),
                description: 'Unbalanced entry',
                entries: [
                    { accountCode: '1121', accountName: 'Receivable', debit: 100000, description: 'Dr' },
                    { accountCode: '4110', accountName: 'Revenue', credit: 90000, description: 'Cr' },
                ],
                ifrsStandard: 'IFRS_15' as const,
                recognitionDate: new Date(),
                measurementBasis: 'FAIR_VALUE' as const,
                aiCategorized: true,
                aiConfidence: 0.95,
                requiresReview: false,
            };

            expect(agent.validateDoubleEntry(entry)).toBe(false);
        });
    });
});

// ============================================================================
// AUDIT RISK AGENT TESTS
// ============================================================================

describe('AuditRiskAgent', () => {
    let agent: AuditRiskAgent;

    beforeEach(() => {
        agent = createAuditRiskAgent();
    });

    describe('calculateMateriality', () => {
        it('should calculate materiality based on financials', () => {
            const result = agent.calculateMateriality({
                totalAssets: 1000000000,
                profitBeforeTax: 50000000,
                revenue: 500000000,
                equity: 200000000,
                isPIE: false,
                isLossmaking: false,
            });

            // Materiality should be calculated and greater than 0
            expect(result.overallMateriality).toBeGreaterThan(0);
            expect(result.baseType).toBeDefined();
            expect(result.performanceMateriality).toBeLessThan(result.overallMateriality);
        });

        it('should calculate performance materiality as portion of overall', () => {
            const result = agent.calculateMateriality({
                totalAssets: 100000000,
                profitBeforeTax: 80000000,
                revenue: 200000000,
                equity: 50000000,
                isPIE: false,
                isLossmaking: false,
            });

            expect(result.performanceMateriality).toBeGreaterThan(0);
            // Performance materiality is typically 50-75% of overall
            expect(result.performanceMateriality).toBeLessThanOrEqual(result.overallMateriality);
        });

        it('should use lower materiality for PIE entities', () => {
            const normalResult = agent.calculateMateriality({
                totalAssets: 1000000000,
                profitBeforeTax: 100000000,
                revenue: 500000000,
                equity: 200000000,
                isPIE: false,
                isLossmaking: false,
            });

            const pieResult = agent.calculateMateriality({
                totalAssets: 1000000000,
                profitBeforeTax: 100000000,
                revenue: 500000000,
                equity: 200000000,
                isPIE: true,
                isLossmaking: false,
            });

            expect(pieResult.overallMateriality).toBeLessThan(normalResult.overallMateriality);
        });
    });
});

// ============================================================================
// ANOMALY DETECTION AGENT TESTS
// ============================================================================

describe('AnomalyDetectionAgent', () => {
    let agent: AnomalyDetectionAgent;

    beforeEach(() => {
        agent = createAnomalyDetectionAgent();
    });

    describe('detectPointAnomalies', () => {
        it('should detect statistical outliers', () => {
            const transactions: TransactionInput[] = [
                { id: 'tx-01', date: new Date(), description: 'Normal', amount: 100000, type: 'EXPENSE' },
                { id: 'tx-02', date: new Date(), description: 'Normal', amount: 110000, type: 'EXPENSE' },
                { id: 'tx-03', date: new Date(), description: 'Normal', amount: 95000, type: 'EXPENSE' },
                { id: 'tx-04', date: new Date(), description: 'Normal', amount: 105000, type: 'EXPENSE' },
                { id: 'tx-05', date: new Date(), description: 'OUTLIER', amount: 10000000, type: 'EXPENSE' }, // Outlier
            ];

            const anomalies = agent.detectPointAnomalies(transactions);

            expect(anomalies.length).toBeGreaterThan(0);
            expect(anomalies.some(a => a.transactionId === 'tx-05')).toBe(true);
        });

        it('should not flag normal transactions', () => {
            const transactions: TransactionInput[] = [
                { id: 'tx-01', date: new Date(), description: 'Normal', amount: 100000, type: 'EXPENSE' },
                { id: 'tx-02', date: new Date(), description: 'Normal', amount: 110000, type: 'EXPENSE' },
                { id: 'tx-03', date: new Date(), description: 'Normal', amount: 95000, type: 'EXPENSE' },
                { id: 'tx-04', date: new Date(), description: 'Normal', amount: 105000, type: 'EXPENSE' },
                { id: 'tx-05', date: new Date(), description: 'Normal', amount: 102000, type: 'EXPENSE' },
            ];

            const anomalies = agent.detectPointAnomalies(transactions);

            expect(anomalies.length).toBe(0);
        });
    });

    describe('detectCollectiveAnomalies', () => {
        it('should detect just-below-threshold transactions', () => {
            const transactions: TransactionInput[] = [
                { id: 'tx-01', date: new Date(), description: 'Below threshold', amount: 99000, type: 'EXPENSE' },
                { id: 'tx-02', date: new Date(), description: 'Below threshold', amount: 98500, type: 'EXPENSE' },
                { id: 'tx-03', date: new Date(), description: 'Below threshold', amount: 99500, type: 'EXPENSE' },
            ];

            const anomalies = agent.detectCollectiveAnomalies(transactions);

            expect(anomalies.some(a => a.description.includes('threshold'))).toBe(true);
        });
    });
});
