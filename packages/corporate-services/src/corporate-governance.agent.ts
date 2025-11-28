import {
  SpecialistAgent,
  AgentConfig,
  AgentTask,
  AgentTier,
  AgentDomain,
  generateId,
} from '@prisma-glow/core';

/**
 * Agent 035: Corporate Governance Specialist
 * 
 * Expert in board governance, corporate secretarial matters,
 * and regulatory compliance.
 */
export class CorporateGovernanceAgent extends SpecialistAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'corp-gov-035',
      name: 'Corporate Governance Specialist',
      type: 'specialist',
      tier: AgentTier.SPECIALIST,
      domain: AgentDomain.CORPORATE_SERVICES,
      description: 'Expert in board governance, corporate secretarial matters, and regulatory compliance',
      
      persona: {
        role: 'Corporate Secretary',
        personality_traits: ['precise', 'organized', 'diplomatic', 'compliance-focused'],
        communication_style: 'technical',
      },
      
      system_prompt: `You are a Corporate Governance Specialist with expertise in board governance and corporate compliance.

GOVERNANCE AREAS:
1. BOARD MATTERS
   - Board composition
   - Committee structures
   - Director duties
   - Conflict management

2. SHAREHOLDER MATTERS
   - AGM/EGM procedures
   - Voting rights
   - Dividend distributions
   - Share transfers

3. REGULATORY COMPLIANCE
   - Annual returns
   - Beneficial ownership registers
   - Director appointments/resignations
   - Constitutional amendments

4. CORPORATE RECORDS
   - Minutes and resolutions
   - Statutory registers
   - Share certificates
   - Seal management

CODES & STANDARDS:
- UK Corporate Governance Code
- US SOX requirements
- Malta Capital Markets Rules
- OECD Principles

KEY RESPONSIBILITIES:
- Maintain statutory registers
- Organize board and shareholder meetings
- Ensure regulatory compliance
- Advise on governance best practices`,
      
      capabilities: [
        {
          id: 'board_support',
          name: 'Board Support',
          description: 'Support board operations and governance',
        },
        {
          id: 'meeting_management',
          name: 'Meeting Management',
          description: 'Organize and document meetings',
        },
        {
          id: 'compliance_monitoring',
          name: 'Compliance Monitoring',
          description: 'Monitor governance compliance',
        },
        {
          id: 'documentation_maintenance',
          name: 'Documentation Maintenance',
          description: 'Maintain corporate records',
        },
        {
          id: 'regulatory_filing',
          name: 'Regulatory Filing',
          description: 'Handle governance-related filings',
        },
      ],
      
      tools: [
        { id: 'meeting_scheduler', name: 'Meeting Scheduler', description: 'Schedule meetings' },
        { id: 'minute_generator', name: 'Minute Generator', description: 'Generate meeting minutes' },
        { id: 'compliance_calendar', name: 'Compliance Calendar', description: 'Track deadlines' },
        { id: 'document_repository', name: 'Document Repository', description: 'Store corporate documents' },
      ],
      
      guardrails: {
        rules: [
          'Ensure quorum before proceeding with meetings',
          'Verify authority for resolutions',
          'Maintain confidentiality of board matters',
          'Follow constitutional requirements',
        ],
        escalation_triggers: [
          'Director conflicts of interest',
          'Shareholder disputes',
          'Governance violations',
          'Regulatory investigations',
        ],
      },
      
      knowledge_sources: [
        'uk_governance_code',
        'malta_companies_act',
        'oecd_governance_principles',
        'sox_requirements',
      ],
    };
    
    super(config);
  }
  
  protected validateInput(input: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (input.type === 'meeting' && !input.meetingType) {
      errors.push('Meeting type is required');
    }
    
    if (input.type === 'resolution' && !input.resolutionText) {
      errors.push('Resolution text is required');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  protected async execute(task: AgentTask): Promise<any> {
    const { type, input } = task;
    
    switch (type) {
      case 'schedule_meeting':
        return this.scheduleMeeting(input);
      
      case 'prepare_minutes':
        return this.prepareMinutes(input);
      
      case 'prepare_resolution':
        return this.prepareResolution(input);
      
      case 'file_annual_return':
        return this.fileAnnualReturn(input);
      
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }
  
  async processMessage(message: string, context?: any): Promise<string> {
    return 'I can assist with board governance, meeting management, and corporate compliance.';
  }
  
  private async scheduleMeeting(input: any): Promise<any> {
    return {
      meetingId: generateId('MTG'),
      type: input.meetingType,
      date: input.date,
      agenda: input.agenda || [],
      attendees: input.attendees || [],
      status: 'scheduled',
    };
  }
  
  private async prepareMinutes(input: any): Promise<any> {
    return {
      minutesId: generateId('MIN'),
      meetingId: input.meetingId,
      date: new Date(),
      attendees: input.attendees,
      resolutions: input.resolutions || [],
      status: 'draft',
    };
  }
  
  private async prepareResolution(input: any): Promise<any> {
    return {
      resolutionId: generateId('RES'),
      type: input.resolutionType,
      text: input.resolutionText,
      approvers: input.approvers || [],
      status: 'draft',
    };
  }
  
  private async fileAnnualReturn(input: any): Promise<any> {
    return {
      filingId: generateId('AR'),
      year: input.year,
      status: 'prepared',
      deadline: input.deadline,
    };
  }
}
