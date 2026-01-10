
import { describe, it, expect, beforeEach } from 'vitest';
import { CAS315RiskAssessmentAgent } from '../cas315-risk-assessment-agent.js';
import type {
    ClientProfile,
    AuditEngagement,
    AuditContext,
    EntityRisk
} from '../../types/index.js';

describe('CAS315RiskAssessmentAgent', () => {
    let agent: CAS315RiskAssessmentAgent;

    beforeEach(() => {
        agent = new CAS315RiskAssessmentAgent();
    });

    const mockProfile: ClientProfile = {
        entityId: 'client-1',
        entityName: 'Test Client',
        entityType: 'private_enterprise',
        industry: 'TECHNOLOGY',
        revenueCAD: 50_000_000,
        totalAssetsCAD: 20_000_000,
        employeeCount: 150,
        province: 'ON',
        debtToEquity: 1.5,
        isPubliclyTraded: false,
        hasForeignOperations: true,
        hasRelatedPartyTransactions: true,
        priorYearAuditFindings: []
    };

    const mockEngagement: AuditEngagement = {
        engagementId: 'eng-2025-001',
        entityId: 'client-1',
        entityName: 'Test Client',
        entityType: 'private_enterprise',
        fiscalYearEnd: new Date('2025-12-31'),
        industry: 'TECHNOLOGY',
        province: 'ON',
        isFirstYearAudit: true,
        isGroupAudit: true,
        requiresCPABOversight: false,
        requiresSOX404: false,
        requiresNI52109: false
    };

    const mockContext: AuditContext = {
        engagementId: 'eng-2025-001',
        userId: 'user-1',
        organizationId: 'org-1',
        fiscalYearEnd: new Date('2025-12-31'),
        entityType: 'private_enterprise',
        province: 'ON',
        isCPABEngagement: false
    };

    describe('performRiskAssessment', () => {
        it('should identify significant risks for first-year audit', () => {
            const result = agent.performRiskAssessment(
                mockEngagement,
                mockProfile,
                [],
                mockContext
            );

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();

            const entityRisks = result.data?.entityRisks || [];
            const firstYearRisk = entityRisks.find(r => r.area === 'First-Year Audit');
            expect(firstYearRisk).toBeDefined();
            expect(firstYearRisk?.description).toContain('First-year engagement');
        });

        it('should identify high risk for foreign operations', () => {
            const result = agent.performRiskAssessment(
                mockEngagement,
                mockProfile,
                [],
                mockContext
            );

            const groupRisk = result.data?.entityRisks?.find(r => r.area === 'Group Audit');
            expect(groupRisk).toBeDefined();
        });

        it('should calculate materiality based on revenue', () => {
            const result = agent.performRiskAssessment(
                mockEngagement,
                mockProfile,
                [],
                mockContext
            );

            // 0.5% of 50M = 250k
            expect(result.data?.materiality.overallMateriality).toBeCloseTo(250_000, 0);
            expect(result.data?.materiality.performanceMateriality).toBeCloseTo(187_500, 0); // 75%
        });

        it('should elevate risk for recurring prior year findings', () => {
            const priorFinding: EntityRisk = {
                riskId: 'OLD-1',
                area: 'Revenue Recognition', // Matches one of the CPAB risks or similar
                description: 'Old issue',
                likelihood: 'moderate',
                impact: 'moderate',
                overallLevel: 'moderate',
                casReference: 'CAS_315',
                auditResponse: []
            };

            // We need to make sure 'Revenue Recognition' is generated as a risk in current assessment
            // The agent generates 'Industry Risk', 'Group Audit', 'First-Year Audit' etc.
            // It generates 'Revenue Recognition' if CPAB mode & public traded.
            // Or 'Industry Risk' dependent.

            // Let's use 'Group Audit' which we know is generated.
            const priorGroupRisk: EntityRisk = {
                ...priorFinding,
                area: 'Group Audit'
            };

            const result = agent.performRiskAssessment(
                mockEngagement,
                mockProfile,
                [priorGroupRisk],
                mockContext
            );

            const groupRisk = result.data?.entityRisks?.find(r => r.area === 'Group Audit');
            expect(groupRisk?.description).toContain('Recurring from prior year');
            expect(groupRisk?.overallLevel).toBe('high'); // Was moderate in logic + elevation = high
        });
    });
});
