import {
  SpecialistAgent,
  AgentConfig,
  AgentTask,
  AgentTier,
  AgentDomain,
  Jurisdiction,
} from '@prisma-glow/core';

/**
 * Agent 041: Board Meetings & Minutes Specialist
 *
 * Handles agenda preparation, minutes drafting, resolution templates,
 * and board action tracking.
 */
export class BoardMeetingsAgent extends SpecialistAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'corp-board-041',
      name: 'Board Meetings & Minutes Specialist',
      type: 'specialist',
      tier: AgentTier.SPECIALIST,
      domain: AgentDomain.CORPORATE_SERVICES,
      description:
        'Expert in board meeting management, minutes preparation, and corporate resolutions',

      persona: {
        role: 'Corporate Secretary',
        personality_traits: ['organized', 'precise', 'professional', 'timely'],
        communication_style: 'technical',
      },

      system_prompt: `You are a Board Meetings & Minutes Specialist with expertise in corporate governance.

BOARD MEETING MANAGEMENT:
1. MEETING PREPARATION
   - Agenda preparation
   - Board pack compilation
   - Notice requirements
   - Quorum verification

2. MEETING CONDUCT
   - Quorum confirmation
   - Chairman's duties
   - Voting procedures
   - Conflict management

3. MINUTES DRAFTING
   - Attendance record
   - Decisions and resolutions
   - Action items
   - Dissenting opinions

4. RESOLUTIONS
   - Board resolutions
   - Written resolutions
   - Shareholder resolutions
   - Special resolutions

5. RECORD KEEPING
   - Minute book maintenance
   - Resolution register
   - Statutory filings
   - Retention requirements`,

      capabilities: [
        {
          id: 'agenda_preparation',
          name: 'Agenda Preparation',
          description: 'Prepare board meeting agendas',
          requiredTools: ['agenda_template', 'calendar'],
        },
        {
          id: 'minutes_drafting',
          name: 'Minutes Drafting',
          description: 'Draft board meeting minutes',
          requiredTools: ['minutes_template', 'resolution_library'],
        },
        {
          id: 'resolution_preparation',
          name: 'Resolution Preparation',
          description: 'Prepare corporate resolutions',
          requiredTools: ['resolution_templates', 'document_generator'],
        },
        {
          id: 'action_tracking',
          name: 'Action Tracking',
          description: 'Track board action items',
          requiredTools: ['action_tracker', 'reminder_system'],
        },
      ],

      tools: [
        {
          id: 'agenda_template',
          name: 'Agenda Template',
          description: 'Standard board meeting agenda templates',
        },
        {
          id: 'minutes_template',
          name: 'Minutes Template',
          description: 'Board minutes templates',
        },
        {
          id: 'resolution_library',
          name: 'Resolution Library',
          description: 'Library of standard resolutions',
        },
        {
          id: 'action_tracker',
          name: 'Action Tracker',
          description: 'Board action item tracker',
        },
      ],

      guardrails: {
        rules: [
          'Ensure proper notice given',
          'Verify quorum before proceedings',
          'Document all decisions accurately',
          'File statutory resolutions timely',
        ],
        escalation_triggers: [
          'Quorum issues',
          'Director conflicts',
          'Special resolution requirements',
          'Filing deadline approaching',
        ],
      },

      jurisdictions: [Jurisdiction.EU_MALTA, Jurisdiction.RWANDA, Jurisdiction.UK],
    };

    super(config);
  }

  protected validateInput(input: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.companyName) {
      errors.push('Company name is required');
    }

    return { valid: errors.length === 0, errors };
  }

  protected async execute(task: AgentTask): Promise<any> {
    const { type, input } = task;

    switch (type) {
      case 'prepare_agenda':
        return this.prepareAgenda(input);

      case 'draft_minutes':
        return this.draftMinutes(input);

      case 'prepare_resolution':
        return this.prepareResolution(input);

      case 'track_actions':
        return this.trackActions(input);

      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  async processMessage(message: string, context?: any): Promise<string> {
    this.log('info', 'Processing board meeting message', { message, context });

    if (message.toLowerCase().includes('agenda')) {
      return this.generateAgendaGuidance();
    } else if (message.toLowerCase().includes('minutes')) {
      return this.generateMinutesGuidance();
    } else if (message.toLowerCase().includes('resolution')) {
      return this.generateResolutionGuidance();
    }

    return 'I can help with board meeting preparation, minutes drafting, and corporate resolutions. What do you need assistance with?';
  }

  private async prepareAgenda(input: any): Promise<any> {
    const { companyName, meetingDate, meetingType, items } = input;

    const standardItems = [
      { order: 1, item: 'Call to order and confirmation of quorum', duration: '5 min' },
      { order: 2, item: 'Approval of previous minutes', duration: '5 min' },
      { order: 3, item: 'Matters arising from previous meeting', duration: '10 min' },
      { order: 4, item: 'Chairman\'s report', duration: '15 min' },
      { order: 5, item: 'Financial report', duration: '20 min' },
      ...(items || []).map((item: string, index: number) => ({
        order: 6 + index,
        item,
        duration: '15 min',
      })),
      { order: 100, item: 'Any other business', duration: '10 min' },
      { order: 101, item: 'Date of next meeting', duration: '5 min' },
      { order: 102, item: 'Close of meeting', duration: '1 min' },
    ];

    return {
      companyName,
      meetingType: meetingType || 'Board of Directors Meeting',
      date: meetingDate,
      agenda: standardItems.sort((a, b) => a.order - b.order),
      noticeRequired: '7 days (or as per articles)',
      quorumRequired: 'Majority of directors',
      documentsToCirculate: [
        'Previous meeting minutes',
        'Financial statements',
        'Management reports',
        'Resolutions for approval',
      ],
    };
  }

  private async draftMinutes(input: any): Promise<any> {
    const { companyName, meetingDate, attendees, decisions, actionItems } = input;

    return {
      header: {
        company: companyName,
        meetingType: 'Board of Directors Meeting',
        date: meetingDate,
        time: '10:00 AM',
        venue: 'Registered office or virtual',
      },
      attendance: {
        present: attendees || [],
        absent: [],
        byInvitation: [],
        inTheChair: attendees?.[0] || 'Chairman',
        secretary: 'Company Secretary',
      },
      quorum: 'The Chairman noted that a quorum was present and declared the meeting duly convened.',
      businessTransacted: decisions || [],
      actionItems: actionItems || [],
      closure: {
        nextMeeting: 'To be confirmed',
        closedAt: '11:30 AM',
      },
      signatures: {
        chairman: '____________________',
        date: '____________________',
      },
    };
  }

  private async prepareResolution(input: any): Promise<any> {
    const { resolutionType, subject, details } = input;

    const templates: Record<string, any> = {
      appointment: {
        title: 'Resolution for Appointment of Director',
        recitals: ['WHEREAS the Board wishes to appoint a new director...'],
        resolved: [
          `RESOLVED THAT ${details?.directorName || '[Name]'} be and is hereby appointed as a director of the Company with effect from ${details?.effectiveDate || '[Date]'}.`,
          'RESOLVED THAT the Company Secretary be authorized to file the necessary notifications with the relevant authorities.',
        ],
        filingRequired: true,
        filingDeadline: '14 days from appointment',
      },
      removal: {
        title: 'Resolution for Removal of Director',
        recitals: ['WHEREAS the Board has received resignation from...'],
        resolved: [
          `RESOLVED THAT the resignation of ${details?.directorName || '[Name]'} as director be and is hereby accepted with effect from ${details?.effectiveDate || '[Date]'}.`,
        ],
        filingRequired: true,
        filingDeadline: '14 days from resignation',
      },
      banking: {
        title: 'Banking Resolution',
        recitals: ['WHEREAS the Company requires banking facilities...'],
        resolved: [
          `RESOLVED THAT ${details?.bankName || '[Bank Name]'} be appointed as the banker of the Company.`,
          'RESOLVED THAT the following persons be authorized signatories...',
          'RESOLVED THAT the authorized signatories be empowered to operate the account in accordance with the mandate.',
        ],
        filingRequired: false,
      },
      dividend: {
        title: 'Resolution for Declaration of Dividend',
        recitals: ['WHEREAS the Company has distributable reserves...'],
        resolved: [
          `RESOLVED THAT a ${details?.dividendType || 'final'} dividend of ${details?.amount || '[Amount]'} per share be declared.`,
          `RESOLVED THAT the dividend be paid on ${details?.paymentDate || '[Date]'} to shareholders on the register as at ${details?.recordDate || '[Record Date]'}.`,
        ],
        filingRequired: false,
      },
    };

    const template = templates[resolutionType] || {
      title: `Resolution for ${subject}`,
      recitals: ['WHEREAS...'],
      resolved: ['RESOLVED THAT...'],
      filingRequired: false,
    };

    return {
      ...template,
      type: 'Board Resolution',
      passedBy: 'Board of Directors',
      date: new Date().toISOString().split('T')[0],
      signatures: ['Chairman', 'Director'],
    };
  }

  private async trackActions(input: any): Promise<any> {
    const { companyName, meetingDate } = input;

    return {
      companyName,
      meetingDate,
      actionItems: [
        {
          id: 'ACT-001',
          action: 'File director appointment with registry',
          assignee: 'Company Secretary',
          dueDate: '14 days from meeting',
          status: 'pending',
          priority: 'high',
        },
        {
          id: 'ACT-002',
          action: 'Circulate approved minutes to all directors',
          assignee: 'Company Secretary',
          dueDate: '7 days from meeting',
          status: 'pending',
          priority: 'medium',
        },
      ],
      overdueItems: [],
      completedItems: [],
    };
  }

  private generateAgendaGuidance(): string {
    return `Board Meeting Agenda Guide:

**Standard Agenda Items:**
1. Call to order and quorum confirmation
2. Approval of previous minutes
3. Matters arising
4. Reports (Chairman, CEO, CFO)
5. Specific business items
6. Any other business
7. Date of next meeting
8. Close

**Best Practices:**
- Circulate agenda 7+ days in advance
- Include time allocations
- Attach relevant documents
- Note required resolutions

Need help preparing a specific agenda?`;
  }

  private generateMinutesGuidance(): string {
    return `Board Minutes Drafting Guide:

**Essential Elements:**
1. Company name and meeting details
2. Attendance (present, absent, invitees)
3. Quorum confirmation
4. Business transacted
5. Decisions and resolutions
6. Action items with owners
7. Next meeting date
8. Chairman's signature

**Best Practices:**
- Record decisions, not discussions
- Use clear, precise language
- Document dissenting views if requested
- Circulate draft within 7 days
- File signed copy in minute book

Would you like me to draft minutes for a specific meeting?`;
  }

  private generateResolutionGuidance(): string {
    return `Corporate Resolutions Guide:

**Resolution Types:**
1. **Board Resolution**: Passed by directors
2. **Ordinary Resolution**: Simple majority of shareholders
3. **Special Resolution**: 75% shareholder approval
4. **Written Resolution**: Without a meeting

**Common Resolutions:**
- Director appointments/removals
- Banking mandates and signatories
- Share allotments
- Dividend declarations
- Financial statements approval
- Auditor appointments

**Filing Requirements:**
- Some resolutions require registry filing
- Typical deadline: 14 days
- Keep copies in statutory records

What type of resolution do you need?`;
  }
}
