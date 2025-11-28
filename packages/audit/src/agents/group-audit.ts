/**
 * Agent 018: Group Audit Specialist
 * ISA 600 - Special Considerations—Audits of Group Financial Statements
 */

import type { AgentConfig, AgentRequest, AgentResponse, GroupComponent } from '../types';

export const GROUP_AUDIT_AGENT_CONFIG: AgentConfig = {
  id: 'audit-group-018',
  name: 'Group Audit Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Coordinates group audit engagements, manages component auditors, and ensures ISA 600 compliance',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are a Group Audit Specialist with expertise in ISA 600.

GROUP AUDIT FRAMEWORK:
1. UNDERSTANDING THE GROUP - Group structure, Consolidation process, Group-wide controls
2. COMPONENT MATERIALITY - Allocation methodology
3. COMPONENT CLASSIFICATION - Significant (size/risk) vs Non-significant
4. WORK EFFORT - Full audit, Specified accounts, Specified procedures, Analytical
5. COMPONENT AUDITOR MANAGEMENT - Instructions, Review, Communication

MULTI-JURISDICTION CONSIDERATIONS:
- Different auditing standards
- Varying legal requirements
- Language and cultural factors`;

export interface GroupAuditRequest extends AgentRequest {
  task: 'classify_component' | 'allocate_materiality' | 'design_instructions';
  parameters: {
    componentName?: string;
    componentRevenue?: number;
    componentAssets?: number;
    groupRevenue?: number;
    groupAssets?: number;
    groupMateriality?: number;
    significantRisks?: string[];
  };
}

export async function classifyComponent(
  componentName: string,
  componentRevenue: number,
  componentAssets: number,
  groupRevenue: number,
  groupAssets: number
): Promise<AgentResponse<GroupComponent>> {
  const revenuePercentage = (componentRevenue / groupRevenue) * 100;
  const assetPercentage = (componentAssets / groupAssets) * 100;

  let classification: 'significant_size' | 'significant_risk' | 'non_significant';
  let workEffort: 'full_audit' | 'specified_accounts' | 'specified_procedures' | 'analytical_only';

  if (revenuePercentage > 15 || assetPercentage > 15) {
    classification = 'significant_size';
    workEffort = 'full_audit';
  } else if (revenuePercentage > 5 || assetPercentage > 5) {
    classification = 'non_significant';
    workEffort = 'specified_procedures';
  } else {
    classification = 'non_significant';
    workEffort = 'analytical_only';
  }

  const component: GroupComponent = {
    id: `COMP-${Date.now()}`,
    name: componentName,
    jurisdiction: 'Unknown',
    classification,
    componentMateriality: 0, // To be calculated
    workEffort,
    instructionsSent: false,
    reportingReceived: false,
    reviewCompleted: false,
  };

  return {
    success: true,
    data: component,
    nextSteps: [
      'Allocate component materiality',
      'Issue instructions to component auditor (if applicable)',
      'Monitor component audit progress',
      'Review component auditor workpapers',
    ],
  };
}

export async function allocateComponentMateriality(
  groupMateriality: number,
  componentPercentage: number,
  isSignificant: boolean
): Promise<AgentResponse<{ componentMateriality: number; performanceMateriality: number }>> {
  // Component materiality typically lower than simple allocation
  let componentMateriality: number;

  if (isSignificant) {
    componentMateriality = Math.round(groupMateriality * (componentPercentage / 100) * 0.9);
  } else {
    componentMateriality = Math.round(groupMateriality * (componentPercentage / 100) * 0.75);
  }

  const performanceMateriality = Math.round(componentMateriality * 0.75);

  return {
    success: true,
    data: { componentMateriality, performanceMateriality },
    nextSteps: ['Communicate materiality to component auditor', 'Document allocation methodology'],
  };
}

export async function handleGroupAuditRequest(request: GroupAuditRequest): Promise<AgentResponse<any>> {
  const { task, parameters } = request;

  switch (task) {
    case 'classify_component':
      if (
        !parameters.componentName ||
        !parameters.componentRevenue ||
        !parameters.groupRevenue ||
        !parameters.componentAssets ||
        !parameters.groupAssets
      ) {
        return { success: false, error: 'Component and group financial data required' };
      }
      return await classifyComponent(
        parameters.componentName,
        parameters.componentRevenue,
        parameters.componentAssets,
        parameters.groupRevenue,
        parameters.groupAssets
      );

    case 'allocate_materiality':
      if (!parameters.groupMateriality || !parameters.componentRevenue || !parameters.groupRevenue) {
        return { success: false, error: 'Group materiality and component percentage required' };
      }
      const percentage = (parameters.componentRevenue / parameters.groupRevenue) * 100;
      return await allocateComponentMateriality(
        parameters.groupMateriality,
        percentage,
        percentage > 15
      );

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
