/**
 * Integration Tests - @prisma/accounting-canada
 * 
 * End-to-end tests with realistic sample data for Canadian accounting workflows.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
    initializeCanadaAccountingSystem,
    selectAccountingFramework,
    getCPAHandbookService,
    type CanadianEntityProfile,
    type RevenueTransaction,
    type AgentContext,
} from '../index.js';

describe('Canada Accounting Integration Tests', () => {
    // Sample Canadian entities
    const sampleEntities: Record<string, CanadianEntityProfile> = {
        // Private tech company in Quebec
        quebecTechPrivate: {
            entityId: 'qc-tech-001',
            name: 'TechNova Solutions Inc.',
            entityType: 'private_enterprise',
            incorporationProvince: 'QC',
            operatingProvinces: ['QC', 'ON'],
            revenue: 8_500_000,
            totalAssets: 4_200_000,
            employees: 35,
            isPubliclyAccountable: false,
            hasPEInvestor: false,
            isCCPC: true,
            fiscalYearEnd: new Date('2025-12-31'),
            requiresBilingualFS: true,
        },
        // PE-backed Ontario company
        ontarioPEBacked: {
            entityId: 'on-pe-001',
            name: 'GrowthTech Canada Corp.',
            entityType: 'private_enterprise',
            incorporationProvince: 'ON',
            operatingProvinces: ['ON', 'BC', 'AB'],
            revenue: 45_000_000,
            totalAssets: 25_000_000,
            employees: 180,
            isPubliclyAccountable: false,
            hasPEInvestor: true,
            isCCPC: false,
            fiscalYearEnd: new Date('2025-03-31'),
            requiresBilingualFS: false,
        },
        // TSX-listed public company
        publicCompany: {
            entityId: 'tsx-001',
            name: 'Canadian Resources Ltd.',
            entityType: 'public_company',
            incorporationProvince: 'AB',
            operatingProvinces: ['AB', 'BC', 'SK'],
            revenue: 250_000_000,
            totalAssets: 500_000_000,
            employees: 850,
            isPubliclyAccountable: true,
            hasPEInvestor: false,
            isCCPC: false,
            fiscalYearEnd: new Date('2025-12-31'),
            requiresBilingualFS: false,
        },
        // Non-profit organization
        nonprofit: {
            entityId: 'npo-001',
            name: 'Community Health Foundation',
            entityType: 'not_for_profit',
            incorporationProvince: 'ON',
            operatingProvinces: ['ON'],
            revenue: 2_500_000,
            totalAssets: 1_800_000,
            employees: 25,
            isPubliclyAccountable: false,
            hasPEInvestor: false,
            isCCPC: false,
            fiscalYearEnd: new Date('2025-03-31'),
            requiresBilingualFS: false,
        },
    };

    describe('End-to-End Framework Selection', () => {
        it('should route Quebec private company to ASPE with bilingual requirement', () => {
            const result = selectAccountingFramework(sampleEntities.quebecTechPrivate);

            expect(result.framework).toBe('ASPE');
            expect(result.bilingualRequired).toBe(true);
            expect(result.alternativeAllowed).toBe(true);
            expect(result.regulatoryReferences).toContain('CPA Canada Handbook Part II');
        });

        it('should recommend IFRS for PE-backed company over $20M revenue', () => {
            const result = selectAccountingFramework(sampleEntities.ontarioPEBacked);

            expect(result.framework).toBe('IFRS');
            expect(result.bilingualRequired).toBe(false);
            expect(result.reason).toContain('PE investor');
        });

        it('should require IFRS for publicly accountable entity', () => {
            const result = selectAccountingFramework(sampleEntities.publicCompany);

            expect(result.framework).toBe('IFRS');
            expect(result.alternativeAllowed).toBe(false);
        });

        it('should select ASNFPO for non-profit organization', () => {
            const result = selectAccountingFramework(sampleEntities.nonprofit);

            expect(result.framework).toBe('ASNFPO');
        });
    });

    describe('Full Accounting Workflow', () => {
        let agents: ReturnType<typeof initializeCanadaAccountingSystem>;

        beforeAll(() => {
            agents = initializeCanadaAccountingSystem();
        });

        it('should initialize all agents successfully', () => {
            expect(agents.standardsEngine).toBeDefined();
            expect(agents.revenueRecognition).toBeDefined();
            expect(agents.bilingual).toBeDefined();
            expect(agents.monthEndClose).toBeDefined();
        });

        it('should process SaaS revenue transaction end-to-end', async () => {
            const transaction: RevenueTransaction = {
                transactionId: 'rev-001',
                entityId: 'qc-tech-001',
                transactionDate: new Date('2025-06-15'),
                customerName: 'Enterprise Client Corp',
                contractDocument: 'MSA-2025-001',
                industry: 'SAAS',
                totalPrice: 120_000,
                currency: 'CAD',
                province: 'ON',
                elements: [
                    {
                        elementId: 'elem-1',
                        description: 'Annual SaaS License',
                        type: 'license',
                        amount: 100_000,
                        recognitionTiming: 'over_time',
                        recognitionPeriodMonths: 12,
                    },
                    {
                        elementId: 'elem-2',
                        description: 'Implementation Services',
                        type: 'service',
                        amount: 20_000,
                        deliveryDate: new Date('2025-07-01'),
                        recognitionTiming: 'point_in_time',
                    },
                ],
            };

            const context: AgentContext = {
                entityId: 'qc-tech-001',
                userId: 'user-001',
                organizationId: 'org-001',
                fiscalYearEnd: new Date('2025-12-31'),
                framework: 'ASPE',
                province: 'QC',
            };

            const result = await agents.revenueRecognition.processTransaction(
                transaction,
                'ASPE',
                context
            );

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.recognitionSchedule.length).toBeGreaterThan(0);
            expect(result.data?.journalEntries.length).toBeGreaterThan(0);
        });
    });

    describe('CPA Handbook Service Integration', () => {
        it('should retrieve related standards for IFRS 15', () => {
            const handbook = getCPAHandbookService();
            const related = handbook.getRelatedStandards('IFRS15');

            expect(related.length).toBeGreaterThan(0);
            expect(related.some(s => s.id === 'IFRS9')).toBe(true);
        });

        it('should search standards by keyword', () => {
            const handbook = getCPAHandbookService();
            const results = handbook.searchStandards({
                query: 'revenue',
                maxResults: 5,
            });

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].standard.title.toLowerCase()).toContain('revenue');
        });
    });
});
