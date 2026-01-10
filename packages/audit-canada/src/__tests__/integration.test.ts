/**
 * Integration Tests - @prisma/audit-canada
 * 
 * End-to-end tests with realistic sample data for Canadian audit workflows.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
    CAS315RiskAssessmentAgent,
    type ClientProfile,
    type AuditEngagement,
    type AuditContext,
} from '../index.js';

describe('Canada Audit Integration Tests', () => {
    // Sample audit clients
    const sampleClients: Record<string, ClientProfile> = {
        // Public mining company (TSX)
        miningPublic: {
            entityId: 'mining-001',
            entityName: 'Northern Gold Resources Corp.',
            entityType: 'public_company',
            industry: 'MINING',
            province: 'BC',
            revenueCAD: 85_000_000,
            totalAssetsCAD: 250_000_000,
            employeeCount: 420,
            debtToEquity: 0.8,
            isPubliclyTraded: true,
            hasForeignOperations: true,
            hasRelatedPartyTransactions: true,
            priorYearAuditFindings: [],
        },
        // Technology startup
        techStartup: {
            entityId: 'tech-001',
            entityName: 'CloudScale Technologies Inc.',
            entityType: 'private_enterprise',
            industry: 'TECHNOLOGY',
            province: 'ON',
            revenueCAD: 12_000_000,
            totalAssetsCAD: 8_000_000,
            employeeCount: 45,
            debtToEquity: 2.5,
            isPubliclyTraded: false,
            hasForeignOperations: false,
            hasRelatedPartyTransactions: false,
            priorYearAuditFindings: [],
        },
        // Cannabis company (high risk)
        cannabisCo: {
            entityId: 'cannabis-001',
            entityName: 'GreenLeaf Canada Corp.',
            entityType: 'public_company',
            industry: 'CANNABIS',
            province: 'AB',
            revenueCAD: 45_000_000,
            totalAssetsCAD: 120_000_000,
            employeeCount: 280,
            debtToEquity: 4.2,
            isPubliclyTraded: true,
            hasForeignOperations: false,
            hasRelatedPartyTransactions: true,
            priorYearAuditFindings: [],
        },
    };

    const sampleEngagements: Record<string, AuditEngagement> = {
        miningAudit: {
            engagementId: 'eng-mining-2025',
            entityId: 'mining-001',
            entityName: 'Northern Gold Resources Corp.',
            entityType: 'public_company',
            fiscalYearEnd: new Date('2025-12-31'),
            industry: 'MINING',
            province: 'BC',
            isFirstYearAudit: false,
            isGroupAudit: true,
            requiresCPABOversight: true,
            requiresSOX404: false,
            requiresNI52109: true,
        },
        techAudit: {
            engagementId: 'eng-tech-2025',
            entityId: 'tech-001',
            entityName: 'CloudScale Technologies Inc.',
            entityType: 'private_enterprise',
            fiscalYearEnd: new Date('2025-12-31'),
            industry: 'TECHNOLOGY',
            province: 'ON',
            isFirstYearAudit: true,
            isGroupAudit: false,
            requiresCPABOversight: false,
            requiresSOX404: false,
            requiresNI52109: false,
        },
    };

    describe('Comprehensive Risk Assessment Workflow', () => {
        let agent: CAS315RiskAssessmentAgent;

        beforeAll(() => {
            agent = new CAS315RiskAssessmentAgent({ enableCPABMode: true });
        });

        it('should perform full risk assessment for public mining company', () => {
            const context: AuditContext = {
                engagementId: 'eng-mining-2025',
                userId: 'auditor-001',
                organizationId: 'firm-001',
                fiscalYearEnd: new Date('2025-12-31'),
                entityType: 'public_company',
                province: 'BC',
                isCPABEngagement: true,
            };

            const result = agent.performRiskAssessment(
                sampleEngagements.miningAudit,
                sampleClients.miningPublic,
                [],
                context
            );

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();

            // Should identify CPAB focus areas
            const entityRisks = result.data!.entityRisks;
            expect(entityRisks.some(r => r.area.includes('Revenue'))).toBe(true);

            // Should identify group audit risks
            expect(entityRisks.some(r => r.area === 'Group Audit')).toBe(true);

            // Should identify related party risks
            expect(entityRisks.some(r => r.area === 'Related Party Transactions')).toBe(true);

            // Significant risks should include fraud
            expect(result.data!.significantRisks.length).toBeGreaterThan(0);
            expect(result.data!.fraudRisks.length).toBe(2); // Revenue + MOC

            // Materiality based on revenue
            expect(result.data!.materiality.overallMateriality).toBeGreaterThan(0);
        });

        it('should identify first-year audit risks', () => {
            const context: AuditContext = {
                engagementId: 'eng-tech-2025',
                userId: 'auditor-001',
                organizationId: 'firm-001',
                fiscalYearEnd: new Date('2025-12-31'),
                entityType: 'private_enterprise',
                province: 'ON',
                isCPABEngagement: false,
            };

            const result = agent.performRiskAssessment(
                sampleEngagements.techAudit,
                sampleClients.techStartup,
                [],
                context
            );

            expect(result.success).toBe(true);

            // Should identify first-year audit risk
            const firstYearRisk = result.data!.entityRisks.find(
                r => r.area === 'First-Year Audit'
            );
            expect(firstYearRisk).toBeDefined();
            expect(firstYearRisk!.auditResponse).toContain('Extend understanding procedures');
        });

        it('should identify going concern for high leverage entity', () => {
            const context: AuditContext = {
                engagementId: 'eng-cannabis-2025',
                userId: 'auditor-001',
                organizationId: 'firm-001',
                fiscalYearEnd: new Date('2025-12-31'),
                entityType: 'public_company',
                province: 'AB',
                isCPABEngagement: true,
            };

            const cannabisEngagement: AuditEngagement = {
                engagementId: 'eng-cannabis-2025',
                entityId: 'cannabis-001',
                entityName: 'GreenLeaf Canada Corp.',
                entityType: 'public_company',
                fiscalYearEnd: new Date('2025-12-31'),
                industry: 'CANNABIS',
                province: 'AB',
                isFirstYearAudit: false,
                isGroupAudit: false,
                requiresCPABOversight: true,
                requiresSOX404: false,
                requiresNI52109: true,
            };

            const result = agent.performRiskAssessment(
                cannabisEngagement,
                sampleClients.cannabisCo,
                [],
                context
            );

            expect(result.success).toBe(true);

            // Should identify going concern due to high debt/equity (4.2x > 3.0x threshold)
            const gcRisk = result.data!.entityRisks.find(
                r => r.area === 'Going Concern'
            );
            expect(gcRisk).toBeDefined();
            expect(gcRisk!.overallLevel).toBe('significant');
        });
    });

    describe('Materiality Calculation', () => {
        it('should calculate materiality correctly across different benchmarks', () => {
            const agent = new CAS315RiskAssessmentAgent({
                materialityBenchmark: 'revenue',
                materialityPercentage: 0.005,
            });

            const materiality = agent.calculateMateriality(sampleClients.miningPublic);

            // 0.5% of $85M = $425K
            expect(materiality.overallMateriality).toBeCloseTo(425_000, -3);
            expect(materiality.performanceMateriality).toBeCloseTo(318_750, -3); // 75%
            expect(materiality.trivialThreshold).toBeCloseTo(21_250, -3); // 5%
        });
    });

    describe('Audit Program Design', () => {
        it('should design responsive audit program based on assessed risks', () => {
            const agent = new CAS315RiskAssessmentAgent({ enableCPABMode: true });

            const context: AuditContext = {
                engagementId: 'eng-mining-2025',
                userId: 'auditor-001',
                organizationId: 'firm-001',
                fiscalYearEnd: new Date('2025-12-31'),
                entityType: 'public_company',
                province: 'BC',
                isCPABEngagement: true,
            };

            const riskResult = agent.performRiskAssessment(
                sampleEngagements.miningAudit,
                sampleClients.miningPublic,
                [],
                context
            );

            if (riskResult.success && riskResult.data) {
                const auditProgram = agent.designAuditProgram(riskResult.data);

                expect(auditProgram.length).toBeGreaterThan(0);
                expect(auditProgram.every(p => p.procedureId.startsWith('PROC-'))).toBe(true);
                expect(auditProgram.every(p => p.casReference === 'CAS_330')).toBe(true);
            }
        });
    });
});
