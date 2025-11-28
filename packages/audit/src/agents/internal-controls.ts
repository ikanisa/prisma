/**
 * Agent 015: Internal Controls Specialist
 * ISA 315/330 - Internal Control Evaluation and Testing
 * COSO Framework Integration
 */

import type { AgentConfig, AgentRequest, AgentResponse, InternalControl, ControlDeficiency } from '../types';

export const CONTROLS_AGENT_CONFIG: AgentConfig = {
  id: 'audit-control-015',
  name: 'Internal Controls Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Evaluates internal controls, performs walkthroughs, and tests operating effectiveness',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are an Internal Controls Specialist with expertise in COSO framework and ISA 315/330 control evaluation.

COSO FRAMEWORK COMPONENTS:
1. Control Environment
2. Risk Assessment
3. Control Activities
4. Information & Communication
5. Monitoring Activities

CONTROL EVALUATION PROCESS:
1. DESIGN EVALUATION
   - Identify controls relevant to audit
   - Assess design effectiveness
   - Document control descriptions

2. IMPLEMENTATION TESTING
   - Walkthrough procedures
   - Observation, Inquiry, Inspection

3. OPERATING EFFECTIVENESS
   - Nature, timing, extent of tests
   - Documentation of results

IT GENERAL CONTROLS (ITGCs):
- Access controls
- Change management
- Computer operations
- Program development`;

export interface ControlsRequest extends AgentRequest {
  task: 'evaluate_design' | 'test_operating_effectiveness' | 'assess_deficiencies';
  parameters: {
    controlActivity?: string;
    frequency?: string;
    automation?: 'manual' | 'automated' | 'hybrid';
    testResults?: {
      sampleSize: number;
      exceptions: number;
    };
  };
}

export async function evaluateControlDesign(
  controlActivity: string,
  automation: 'manual' | 'automated' | 'hybrid' = 'manual'
): Promise<AgentResponse<InternalControl>> {
  const control: InternalControl = {
    id: `CTL-${Date.now()}`,
    controlActivity,
    cosoComponent: 'control_activities',
    frequency: automation === 'automated' ? 'continuous' : 'daily',
    automation,
    keyControl: true,
    assertions: ['completeness', 'accuracy'],
    designEffective: true,
    operatingEffective: null,
  };

  return {
    success: true,
    data: control,
    nextSteps: [
      'Perform walkthrough to confirm understanding',
      'Test operating effectiveness if relying on control',
      'Document control description and design evaluation',
    ],
  };
}

export async function testOperatingEffectiveness(
  control: InternalControl,
  sampleSize: number,
  exceptions: number
): Promise<AgentResponse<{ operatingEffective: boolean; deficiency?: ControlDeficiency }>> {
  const exceptionRate = (exceptions / sampleSize) * 100;
  const operatingEffective = exceptionRate < 5; // Threshold for effectiveness

  let deficiency: ControlDeficiency | undefined;

  if (!operatingEffective) {
    deficiency = {
      control: control.controlActivity,
      deficiencyType: 'operating_effectiveness',
      severity: exceptionRate > 10 ? 'significant_deficiency' : 'deficiency',
      description: `Control not operating effectively. Exception rate: ${exceptionRate.toFixed(1)}%`,
      potentialMisstatement: `Risk of material misstatement in ${control.assertions.join(', ')} assertions`,
      compensatingControls: [],
    };
  }

  return {
    success: true,
    data: { operatingEffective, deficiency },
    warnings: !operatingEffective
      ? ['Control deficiency identified - cannot rely on control']
      : undefined,
    nextSteps: operatingEffective
      ? ['Document test results', 'Conclude on control reliance']
      : ['Communicate deficiency to management', 'Design additional substantive procedures', 'Evaluate impact on risk assessment'],
  };
}

export async function handleControlsRequest(request: ControlsRequest): Promise<AgentResponse<any>> {
  const { task, parameters } = request;

  switch (task) {
    case 'evaluate_design':
      if (!parameters.controlActivity) {
        return { success: false, error: 'Control activity description required' };
      }
      return await evaluateControlDesign(parameters.controlActivity, parameters.automation);

    case 'test_operating_effectiveness': {
      if (!parameters.controlActivity || !parameters.testResults) {
        return { success: false, error: 'Control and test results required' };
      }
      const control: InternalControl = {
        id: `CTL-${Date.now()}`,
        controlActivity: parameters.controlActivity,
        cosoComponent: 'control_activities',
        frequency: 'daily',
        automation: parameters.automation || 'manual',
        keyControl: true,
        assertions: ['completeness', 'accuracy'],
        designEffective: true,
        operatingEffective: null,
      };
      return await testOperatingEffectiveness(
        control,
        parameters.testResults.sampleSize,
        parameters.testResults.exceptions
      );
    }

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
